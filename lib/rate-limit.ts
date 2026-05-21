/**
 * 경량 in-memory 레이트리밋(T2.7, best-effort).
 *
 * 비싼 공개 엔드포인트(`/q/[slug]/pdf`)와 `/api/revalidate` 의 남용을 막기 위한 최소 보호다.
 * 고정 윈도우(fixed window) 카운터 — 키별로 윈도우 시작 시각과 카운트를 메모리 Map 에 보관한다.
 *
 * ⚠️ **서버리스(Vercel) in-memory 한계**: 이 카운터는 *단일 Node 프로세스(인스턴스) 메모리*에만
 *    존재한다. Vercel 은 요청을 여러 Lambda 인스턴스로 분산하므로 인스턴스 간 카운트가 공유되지
 *    않는다. 즉 실제 허용량은 (설정 임계값 × 동시 인스턴스 수)까지 늘어날 수 있다 → **best-effort**.
 *    버스트성 남용을 둔화시키는 용도이며, 엄격한 전역 보장이 필요하면 분산 스토어
 *    (Upstash/Vercel KV)로 교체해야 한다(측정 기반 백로그, 지금은 만들지 않음).
 *
 * ⚠️ `import "server-only"` 를 두지 않는다 — 순수 Node(`tsx`) 테스트 스크립트가 이 로직을
 *    직접 import 해 검증할 수 있어야 한다(가드가 throw 함). 비밀값을 다루지 않으므로 안전.
 */

/** 한 윈도우 동안의 키별 카운터 상태. */
type WindowState = {
  /** 현재 윈도우 시작 시각(epoch ms). */
  windowStart: number
  /** 현재 윈도우 내 요청 수. */
  count: number
}

/** 레이트리밋 판정 결과. */
export type RateLimitResult = {
  /** 허용 여부(false 면 호출자가 429 로 차단). */
  allowed: boolean
  /** 차단 시 클라이언트가 재시도까지 대기할 초(`Retry-After` 헤더용). 허용 시 0. */
  retryAfterSeconds: number
  /** 남은 허용 횟수(디버깅/헤더용). */
  remaining: number
}

/** 엔드포인트별 레이트리밋 임계값(상수). 합리적 기본값 — 정상 사용엔 닿지 않는 수준. */
export const RATE_LIMITS = {
  /** PDF 생성: 비싼 헤드리스 인쇄 — 분당 10회/IP. */
  pdf: { limit: 10, windowMs: 60_000 },
  /** revalidate webhook: Bearer 인증이 1차 방어 — 분당 30회/IP 로 버스트만 차단. */
  revalidate: { limit: 30, windowMs: 60_000 },
} as const

/**
 * 스윕 기준 = `RATE_LIMITS` 중 가장 긴 윈도우(ms). 이보다 오래된 엔트리는 어떤
 * 엔드포인트 기준으로도 만료된 것이라 안전하게 제거할 수 있다. 새 엔드포인트가 더 긴
 * 윈도우로 추가돼도 자동 반영된다(C2 리뷰 — 하드코딩 60_000 과 RATE_LIMITS 의 결합 해소).
 */
const MAX_WINDOW_MS = Math.max(
  ...Object.values(RATE_LIMITS).map((r) => r.windowMs),
)

/**
 * 키별 윈도우 상태 저장소(모듈 단위 싱글턴).
 * 모듈은 프로세스 생애 동안 한 번만 로드되므로 인스턴스 메모리에 상태가 유지된다.
 */
const store = new Map<string, WindowState>()

/**
 * 만료된(현재 윈도우가 지난) 엔트리를 정리해 Map 무한 증가를 막는다.
 * 매 호출마다 전체를 순회하면 비싸지므로 amortized 로 청소한다:
 * 엔트리가 많으면(≥1000) 매번, 적으면 ~1% 확률로만 순회한다(작을 때도 누적 방지).
 */
function maybeSweep(now: number): void {
  if (store.size < 1000 && Math.random() >= 0.01) return
  for (const [key, state] of store) {
    if (now - state.windowStart > MAX_WINDOW_MS) {
      store.delete(key)
    }
  }
}

/**
 * 고정 윈도우 레이트리밋 판정. 호출 시점에 카운트를 1 증가시키고 허용/차단을 결정한다.
 *
 * @param key    클라이언트 식별 키(예: `pdf:<ip>` 또는 `pdf:<ip>:<slug>`).
 * @param limit  윈도우당 최대 허용 횟수.
 * @param windowMs 윈도우 길이(ms).
 * @returns 허용 여부 + 차단 시 Retry-After 초.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  maybeSweep(now)

  const state = store.get(key)

  // 윈도우가 없거나 만료됐으면 새 윈도우 시작.
  if (!state || now - state.windowStart >= windowMs) {
    store.set(key, { windowStart: now, count: 1 })
    return { allowed: true, retryAfterSeconds: 0, remaining: limit - 1 }
  }

  // 현재 윈도우 내 — 카운트 증가.
  state.count += 1

  // count 는 증가 후 값. limit 번째 호출은 remaining=0 으로 허용되고, limit+1 번째부터 차단.
  if (state.count > limit) {
    // 차단: 윈도우 끝까지 남은 시간을 Retry-After 로(최소 1초).
    const elapsed = now - state.windowStart
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - elapsed) / 1000))
    return { allowed: false, retryAfterSeconds, remaining: 0 }
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: limit - state.count,
  }
}

/**
 * 요청 헤더에서 클라이언트 IP 를 추출한다.
 * Vercel 은 `x-forwarded-for`(쉼표 구분, 첫 값이 원 클라이언트) 를 설정한다.
 * `req.ip` 는 신뢰하지 않고 헤더 기반으로만 판단하며, 없으면 폴백 키를 쓴다.
 *
 * @returns IP 문자열 또는 폴백("unknown").
 */
export function getClientIp(req: Request): string {
  // Vercel 네트워크가 설정하는 실 클라이언트 IP — 클라이언트가 위조하기 쉬운
  // x-forwarded-for 보다 스푸핑 저항성이 높으므로 우선한다(m1 리뷰).
  const vercelIp = req.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim()
  if (vercelIp) return vercelIp
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  // 단일 IP 헤더 폴백.
  const realIp = req.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return "unknown"
}

/**
 * 429 Too Many Requests 응답을 생성한다(`Retry-After` 헤더 + 한국어 메시지).
 *
 * @param retryAfterSeconds 클라이언트가 재시도까지 대기할 초.
 */
export function tooManyRequestsResponse(retryAfterSeconds: number): Response {
  return new Response(
    "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  )
}

/**
 * 테스트 전용 — 저장소를 비운다(시나리오 간 격리). 프로덕션 코드에서 호출하지 않는다.
 */
export function __resetRateLimitStore(): void {
  store.clear()
}
