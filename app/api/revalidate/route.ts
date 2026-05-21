import { timingSafeEqual } from "node:crypto"

import { revalidateTag } from "next/cache"

import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  tooManyRequestsResponse,
} from "@/lib/rate-limit"

/**
 * 타이밍 공격에 안전한 문자열 비교(C1 리뷰 반영).
 * 단순 `!==` 는 일치 길이만큼 조기 종료해 비교 시간이 토큰 내용에 의존 → 부채널 노출.
 * 길이가 다르면 즉시 false(`timingSafeEqual` 은 동일 길이 버퍼만 허용).
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * on-demand 캐시 무효화 webhook — T2.4.
 *
 * Notion 외부 자동화(Make/Zapier 등)가 견적 변경 시 호출한다. 인증된 요청이면
 * 해당 견적의 출력 캐시 태그(`quote:${slug}`)를 무효화해 다음 요청부터 fresh 데이터가
 * 반영되도록 한다. 캐시 태그는 `app/q/[slug]/quote-data.tsx` 의 `cacheTag(`quote:${slug}`)`
 * 와 동일 규칙이어야 한다(SSOT).
 *
 * 인증: `Authorization: Bearer <NOTION_REVALIDATE_SECRET>`.
 *   - 헤더 누락 → 401
 *   - 토큰 불일치 → 403
 *   - 서버에 secret 미설정 → 500 (운영 설정 오류)
 * 요청 본문(JSON): `{ slug: string }`.
 *   - JSON 파싱 실패 / slug 누락·빈 문자열 → 400
 *
 * 운영 가이드: docs/REVALIDATE_SETUP.md
 *
 * ⚠️ 이 프로젝트는 `next.config.ts` 의 `cacheComponents: true` 때문에 Route Handler 에
 *    `export const runtime` 을 추가하면 빌드가 충돌한다(기본 런타임이 이미 nodejs).
 *    따라서 `runtime` export 를 두지 않는다.
 *
 * ⚠️ Next.js 16.2.6 에서 `revalidateTag(tag)` 단일 인자 형식은 deprecated 다.
 *    webhook/외부 시스템이 **즉시 만료**를 요구하는 경우 두 번째 인자로 `{ expire: 0 }` 를
 *    전달한다(공식 문서 권장 패턴 — node_modules/next/dist/docs/01-app/03-api-reference/
 *    04-functions/revalidateTag.md "for webhooks or third-party services that need
 *    immediate expiration").
 */
export async function POST(req: Request): Promise<Response> {
  // 레이트리밋(best-effort) — Bearer 무차별 추측·webhook 폭주를 둔화. 키 = IP 기준.
  // 인증 검사보다 먼저 적용해 토큰 추측 시도 자체의 처리량을 제한한다.
  // ⚠️ 서버리스 in-memory 한계는 lib/rate-limit.ts 주석 참고(인스턴스 간 미공유).
  const ip = getClientIp(req)
  const rl = checkRateLimit(
    `revalidate:${ip}`,
    RATE_LIMITS.revalidate.limit,
    RATE_LIMITS.revalidate.windowMs,
  )
  if (!rl.allowed) {
    return tooManyRequestsResponse(rl.retryAfterSeconds)
  }

  const secret = process.env.NOTION_REVALIDATE_SECRET
  // 서버 설정 오류: secret 미설정 시 인증 자체가 불가능 → 500.
  if (!secret) {
    console.error(
      "[revalidate] 환경변수 NOTION_REVALIDATE_SECRET 미설정 — 인증 불가",
    )
    return Response.json(
      { revalidated: false, error: "Server misconfiguration" },
      { status: 500 },
    )
  }

  // 1) 인증 — Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json(
      { revalidated: false, error: "Missing or malformed Authorization header" },
      { status: 401 },
    )
  }
  const token = authHeader.slice("Bearer ".length).trim()
  if (!safeCompare(token, secret)) {
    return Response.json(
      { revalidated: false, error: "Invalid token" },
      { status: 403 },
    )
  }

  // 2) 본문 파싱 — { slug: string }
  let slug: unknown
  try {
    const body = (await req.json()) as { slug?: unknown }
    slug = body?.slug
  } catch {
    return Response.json(
      { revalidated: false, error: "Invalid JSON body" },
      { status: 400 },
    )
  }
  if (typeof slug !== "string" || slug.trim() === "") {
    return Response.json(
      { revalidated: false, error: "Missing or empty slug" },
      { status: 400 },
    )
  }

  // 3) 캐시 무효화 — `quote:${slug}` 태그를 즉시 만료(webhook 패턴).
  const tag = `quote:${slug}`
  revalidateTag(tag, { expire: 0 })

  return Response.json({ revalidated: true, slug })
}
