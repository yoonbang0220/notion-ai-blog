/**
 * T2.7 — 레이트리밋(best-effort) 자기검증.
 *
 * 두 층위로 검증한다:
 *   A. 순수 단위 — lib/rate-limit.ts 의 `checkRateLimit` 로직(서버 의존 없음).
 *   B. 통합 — 떠 있는 dev 서버의 `/q/<slug>/pdf` 를 임계 초과로 연속 호출 → 429 + Retry-After 확인.
 *
 * 실행(별도 터미널에서 dev 서버를 먼저 띄운 뒤):
 *   1) npm run dev            # 포트 3000
 *   2) node --env-file=.env.local --import tsx scripts/test/rate-limit.ts
 *
 * ⚠️ 통합 테스트는 **잘못된(존재하지 않는) 슬러그**를 사용한다. 라우트 코드 순서가
 *    "레이트리밋 판정 → getQuoteBySlug" 이므로, 임계 이하에서는 404(빠름)·임계 초과에서는
 *    429(404 도달 전)가 반환된다. 이렇게 하면 비싼 헤드리스 PDF 인쇄 없이 빠르게 차단을 검증한다.
 *    정상 PDF 200 회귀는 별도 test:pdf-route 가 담당(임계 이하 단발 호출).
 *
 * 검증 시나리오:
 *   1. (단위) 임계 이하 연속 호출 → 모두 allowed=true, remaining 감소.
 *   2. (단위) 임계 초과 → allowed=false + retryAfterSeconds>0.
 *   3. (단위) 윈도우 경과 후 카운터 리셋 → 다시 allowed.
 *   4. (통합) dev 서버 PDF 라우트 임계 초과 연속 호출 → 일부 429 + Retry-After 헤더.
 *   5. (통합) 단발 정상 호출(active 시드)이 429 가 아님(정상 경로 비차단 확인).
 */

import {
  RATE_LIMITS,
  __resetRateLimitStore,
  checkRateLimit,
} from "../../lib/rate-limit"

type ScenarioResult = { name: string; ok: boolean; detail: string }

const BASE_URL = process.env.PDF_TEST_BASE_URL ?? "http://localhost:3000"
const SEED_SLUG_ACTIVE = process.env.SEED_SLUG_ACTIVE

/** 시나리오 1 — 임계 이하 연속 호출은 모두 허용되고 remaining 이 감소한다. */
function scenario1UnderLimit(): ScenarioResult {
  const name = "1. (단위) 임계 이하 → 모두 허용 + remaining 감소"
  __resetRateLimitStore()
  const limit = 5
  const windowMs = 60_000
  const remainings: number[] = []
  let allAllowed = true
  for (let i = 0; i < limit; i++) {
    const r = checkRateLimit("unit:under", limit, windowMs)
    if (!r.allowed) allAllowed = false
    remainings.push(r.remaining)
  }
  // remaining 은 4,3,2,1,0 으로 감소해야 한다.
  const expected = [4, 3, 2, 1, 0]
  const remainingOk = remainings.join(",") === expected.join(",")
  const ok = allAllowed && remainingOk
  return {
    name,
    ok,
    detail: `allAllowed=${allAllowed}, remaining=[${remainings.join(",")}] (기대 [${expected.join(",")}]) → ${ok ? "PASS" : "FAIL"}`,
  }
}

/** 시나리오 2 — 임계 초과 호출은 차단되고 Retry-After 가 양수다. */
function scenario2OverLimit(): ScenarioResult {
  const name = "2. (단위) 임계 초과 → 차단 + retryAfter>0"
  __resetRateLimitStore()
  const limit = 3
  const windowMs = 60_000
  // limit 만큼 허용 → 그 다음 호출이 차단.
  for (let i = 0; i < limit; i++) checkRateLimit("unit:over", limit, windowMs)
  const blocked = checkRateLimit("unit:over", limit, windowMs)
  const ok =
    blocked.allowed === false &&
    blocked.retryAfterSeconds > 0 &&
    blocked.retryAfterSeconds <= 60
  return {
    name,
    ok,
    detail: `allowed=${blocked.allowed}, retryAfter=${blocked.retryAfterSeconds}s → ${ok ? "PASS" : "FAIL"}`,
  }
}

/** 시나리오 3 — 윈도우 경과 후 카운터가 리셋되어 다시 허용된다(짧은 윈도우로 실측). */
async function scenario3WindowReset(): Promise<ScenarioResult> {
  const name = "3. (단위) 윈도우 경과 후 리셋 → 다시 허용"
  __resetRateLimitStore()
  const limit = 2
  const windowMs = 200 // 짧은 윈도우로 빠르게 검증.
  // 윈도우 소진.
  checkRateLimit("unit:reset", limit, windowMs)
  checkRateLimit("unit:reset", limit, windowMs)
  const blockedBefore = checkRateLimit("unit:reset", limit, windowMs)
  // 윈도우 경과 대기.
  await new Promise((r) => setTimeout(r, windowMs + 50))
  const allowedAfter = checkRateLimit("unit:reset", limit, windowMs)
  const ok = blockedBefore.allowed === false && allowedAfter.allowed === true
  return {
    name,
    ok,
    detail: `경과 전 allowed=${blockedBefore.allowed}, 경과 후 allowed=${allowedAfter.allowed} → ${ok ? "PASS" : "FAIL"}`,
  }
}

/**
 * 시나리오 4 — (통합) dev 서버 PDF 라우트 임계 초과 연속 호출 → 일부 429 + Retry-After.
 * 잘못된 슬러그 사용으로 PDF 생성 비용 없이 빠르게 검증.
 */
async function scenario4IntegrationBlock(): Promise<ScenarioResult> {
  const name = "4. (통합) PDF 라우트 임계 초과 → 429 + Retry-After"
  const limit = RATE_LIMITS.pdf.limit
  // limit+3 회 연속 호출 — 잘못된 슬러그(빠른 처리).
  const slug = "ratelimit-test-invalid-slug"
  const statuses: number[] = []
  let retryAfterSeen: string | null = null
  try {
    for (let i = 0; i < limit + 3; i++) {
      const res = await fetch(`${BASE_URL}/q/${slug}/pdf`)
      statuses.push(res.status)
      if (res.status === 429 && retryAfterSeen === null) {
        retryAfterSeen = res.headers.get("retry-after")
      }
      await res.arrayBuffer() // 연결 정리.
    }
    const count429 = statuses.filter((s) => s === 429).length
    // 처음 limit 회는 404(또는 비-429), 이후는 429 여야 한다.
    const firstBlockIdx = statuses.findIndex((s) => s === 429)
    const ok =
      count429 >= 1 &&
      retryAfterSeen != null &&
      Number(retryAfterSeen) > 0 &&
      firstBlockIdx >= limit // limit 회까지는 차단되지 않아야 함.
    return {
      name,
      ok,
      detail: `statuses=[${statuses.join(",")}], 429수=${count429}, 첫차단idx=${firstBlockIdx}(기대 ≥${limit}), Retry-After=${retryAfterSeen} → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/**
 * 시나리오 5 — (통합) 단발 정상 호출(active 시드)이 429 가 아니다(정상 경로 비차단).
 * ⚠️ 시나리오 4 가 동일 IP 의 다른 slug 키를 소진했더라도, 레이트리밋 키는 slug 별이므로
 *    active 시드 키는 별도 카운터다. 단발 호출은 200 이어야 한다.
 */
async function scenario5IntegrationAllowNormal(): Promise<ScenarioResult> {
  const name = "5. (통합) 단발 정상 호출(active 시드) → 비차단(200)"
  if (!SEED_SLUG_ACTIVE) {
    return {
      name,
      ok: false,
      detail: "SEED_SLUG_ACTIVE 미설정 — .env.local 확인 필요",
    }
  }
  try {
    const res = await fetch(`${BASE_URL}/q/${SEED_SLUG_ACTIVE}/pdf`)
    await res.arrayBuffer()
    const ok = res.status === 200
    return {
      name,
      ok,
      detail: `status=${res.status} (기대 200, 429 아님) → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

async function run() {
  console.log(
    `[환경] BASE_URL=${BASE_URL}, PDF 임계=${RATE_LIMITS.pdf.limit}/${RATE_LIMITS.pdf.windowMs}ms, SEED_SLUG_ACTIVE=${SEED_SLUG_ACTIVE ?? "(미설정)"}`,
  )

  const results: ScenarioResult[] = []

  // A. 단위(서버 불필요).
  results.push(scenario1UnderLimit())
  results.push(scenario2OverLimit())
  results.push(await scenario3WindowReset())

  // B. 통합(dev 서버 필요) — 가용성 확인 후 진행.
  let serverUp = true
  try {
    await fetch(`${BASE_URL}/`, { method: "HEAD" })
  } catch {
    serverUp = false
  }

  if (serverUp) {
    results.push(await scenario4IntegrationBlock())
    results.push(await scenario5IntegrationAllowNormal())
  } else {
    console.warn(
      `\n⚠️ ${BASE_URL} 미응답 — 통합 시나리오 4·5 스킵. dev 서버를 띄우면 전체 검증됩니다.`,
    )
  }

  console.log("\n=== 결과 요약 ===")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  console.log(
    `\n총 ${results.length}건 중 ${results.length - failed.length} PASS / ${failed.length} FAIL`,
  )
  process.exitCode = failed.length > 0 ? 1 : 0
}

void run()
