/**
 * T3.1(관리자 인증) 세션 서명·검증 + 비번 타이밍안전 비교 자기검증.
 *
 * 실행:
 *   npm run test:admin-auth
 *   (내부: node --env-file=.env.local --import tsx scripts/test/admin-auth.ts)
 *
 * ⚠️ lib/admin-auth.ts 는 `import "server-only"` 가드를 가져 순수 Node(tsx) 에서 throw 한다.
 *   세션 서명/검증은 `lib/admin-session.ts`(server-only 없음) 에 있어 import 가능하지만,
 *   가이드(R13)대로 **Web Crypto 로직을 본 스크립트에 동치 복제**해 검증한다(lib 와 동치성은
 *   코드 리뷰로 확보). 비번 비교는 lib/admin-auth.ts::verifyPassword 와 동일한
 *   crypto.timingSafeEqual 로직을 인라인 복제한다.
 *
 * 검증 시나리오:
 *   1. 정상: verifySession(signSession(secret)) → payload 복원(iat/exp 일치, exp=iat+maxAge)
 *   2. 인증 누락/잘못된 비번: token undefined → null. 비번 불일치 → verifyPassword false
 *   3. 위조 서명: 다른 secret 로 검증 / payload 변조 토큰 → null
 *   4. 세션 만료: exp 가 과거(now 미래 주입) → null
 *   5. 타이밍안전 비번 비교: 동일 길이 1글자 차이 → false (timingSafeEqual 경유, 길이 다르면 즉시 false)
 */

import { timingSafeEqual } from "node:crypto"

type ScenarioResult = { name: string; ok: boolean; detail: string }

// ──────── lib/admin-session.ts Web Crypto 로직 인라인 복제 ────────

interface AdminSessionPayload {
  iat: number
  exp: number
}

const MAX_AGE = 30 * 24 * 60 * 60 // 30일(초) — lib 상수와 동일
const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(input: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/")
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return toBase64Url(new Uint8Array(sig))
}

async function hmacVerify(
  secret: string,
  data: string,
  signatureB64Url: string,
): Promise<boolean> {
  const sigBytes = fromBase64Url(signatureB64Url)
  if (!sigBytes) return false
  const key = await importKey(secret)
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data))
}

async function signSession(
  secret: string,
  maxAgeSeconds: number = MAX_AGE,
  now: Date = new Date(),
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000)
  const exp = iat + maxAgeSeconds
  const payload: AdminSessionPayload = { iat, exp }
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await hmacSign(secret, payloadB64)
  return `${payloadB64}.${signature}`
}

async function verifySession(
  secret: string,
  token: string | undefined | null,
  now: Date = new Date(),
): Promise<AdminSessionPayload | null> {
  if (!token) return null
  const dot = token.indexOf(".")
  if (dot <= 0 || dot === token.length - 1) return null
  const payloadB64 = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  if (!(await hmacVerify(secret, payloadB64, signature))) return null
  const payloadBytes = fromBase64Url(payloadB64)
  if (!payloadBytes) return null
  let payload: AdminSessionPayload
  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    ) as Partial<AdminSessionPayload>
    if (typeof parsed.iat !== "number" || typeof parsed.exp !== "number") {
      return null
    }
    payload = { iat: parsed.iat, exp: parsed.exp }
  } catch {
    return null
  }
  const nowSec = Math.floor(now.getTime() / 1000)
  if (payload.exp <= nowSec) return null
  return payload
}

// ──────── lib/admin-auth.ts::verifyPassword 로직 인라인 복제 ────────

/** crypto.timingSafeEqual 기반 비번 비교(lib/admin-auth.ts 와 동일 로직). */
function verifyPasswordEquiv(input: string, expected: string): boolean {
  const bufA = Buffer.from(input, "utf8")
  const bufB = Buffer.from(expected, "utf8")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// ──────── 시나리오 ────────

const TEST_SECRET = "test-admin-session-secret-0123456789abcdef"

/** 시나리오 1: 정상 — sign 후 verify 성공 + payload 복원. */
async function scenario1Normal(): Promise<ScenarioResult> {
  const name = "1. 정상 (sign→verify, payload 복원)"
  try {
    const now = new Date("2026-05-22T00:00:00Z")
    const token = await signSession(TEST_SECRET, MAX_AGE, now)
    const payload = await verifySession(TEST_SECRET, token, now)
    if (!payload) return { name, ok: false, detail: "verify 가 null 반환" }
    const expectedIat = Math.floor(now.getTime() / 1000)
    const ok =
      payload.iat === expectedIat &&
      payload.exp === expectedIat + MAX_AGE &&
      token.includes(".")
    return {
      name,
      ok,
      detail: `iat=${payload.iat} exp=${payload.exp} (exp-iat=${payload.exp - payload.iat}=${MAX_AGE})`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 2: 인증 누락(token undefined) → null + 잘못된 비번 → false. */
async function scenario2MissingAndWrongPassword(): Promise<ScenarioResult> {
  const name = "2. 인증 누락(token undefined→null) + 잘못된 비번(false)"
  try {
    const noToken = await verifySession(TEST_SECRET, undefined)
    const emptyToken = await verifySession(TEST_SECRET, "")
    const wrongPw = verifyPasswordEquiv("wrong-password", "correct-password")
    const ok = noToken === null && emptyToken === null && wrongPw === false
    return {
      name,
      ok,
      detail: `undefined→${noToken} ""→${emptyToken} 비번불일치→${wrongPw}`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 3: 위조 서명 — 다른 secret 으로 검증 / payload 변조 → null. */
async function scenario3Forged(): Promise<ScenarioResult> {
  const name = "3. 위조 서명 (다른 키 / payload 변조 → null)"
  try {
    const now = new Date("2026-05-22T00:00:00Z")
    const token = await signSession(TEST_SECRET, MAX_AGE, now)

    // (a) 다른 secret 으로 검증 → 서명 불일치.
    const wrongKey = await verifySession("a-completely-different-secret", token, now)

    // (b) payload 부분만 미래 exp 로 변조(서명은 원본 유지) → 서명 검증 실패.
    const dot = token.indexOf(".")
    const signature = token.slice(dot + 1)
    const forgedPayload = toBase64Url(
      encoder.encode(JSON.stringify({ iat: 0, exp: 99999999999 })),
    )
    const tampered = `${forgedPayload}.${signature}`
    const tamperedResult = await verifySession(TEST_SECRET, tampered, now)

    const ok = wrongKey === null && tamperedResult === null
    return {
      name,
      ok,
      detail: `다른키→${wrongKey} payload변조→${tamperedResult}`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 4: 세션 만료 — exp 가 과거(검증 시 now 를 미래로) → null. */
async function scenario4Expired(): Promise<ScenarioResult> {
  const name = "4. 세션 만료 (exp 과거 → null)"
  try {
    const issuedAt = new Date("2026-05-22T00:00:00Z")
    // 1초짜리 짧은 세션 발급.
    const token = await signSession(TEST_SECRET, 1, issuedAt)
    // 검증 시점을 발급 +1시간 뒤로 → 만료.
    const later = new Date(issuedAt.getTime() + 60 * 60 * 1000)
    const expired = await verifySession(TEST_SECRET, token, later)
    // 대조군: 발급 직후엔 유효해야 한다(서명 자체는 정상이라는 확인).
    const fresh = await verifySession(TEST_SECRET, token, issuedAt)
    const ok = expired === null && fresh !== null
    return {
      name,
      ok,
      detail: `만료시점→${expired === null ? "null" : "유효(오류)"}, 발급직후→${fresh ? "유효" : "null(오류)"}`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 5: 타이밍안전 비번 비교 — 동일 길이 1글자 차이 → false, 정확 일치 → true. */
function scenario5TimingSafe(): ScenarioResult {
  const name = "5. 타이밍안전 비번 비교 (동일길이 1글자 차이 → false)"
  try {
    const expected = "supersecret-admin-pw-12345" // 26자
    const oneCharOff = "supersecret-admin-pw-12346" // 마지막 1글자만 다름(동일 길이)
    const diffLen = "supersecret-admin-pw-1234" // 길이 다름
    const exact = "supersecret-admin-pw-12345"

    const r1 = verifyPasswordEquiv(oneCharOff, expected) // false (동일길이 → timingSafeEqual)
    const r2 = verifyPasswordEquiv(diffLen, expected) // false (길이 다름 → 즉시 false)
    const r3 = verifyPasswordEquiv(exact, expected) // true

    const ok = r1 === false && r2 === false && r3 === true
    return {
      name,
      ok,
      detail: `1글자차이→${r1} 길이다름→${r2} 정확일치→${r3}`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`
  return String(e)
}

async function run() {
  const results: ScenarioResult[] = []
  results.push(await scenario1Normal())
  results.push(await scenario2MissingAndWrongPassword())
  results.push(await scenario3Forged())
  results.push(await scenario4Expired())
  results.push(scenario5TimingSafe())

  console.log("\n=== 결과 요약 ===")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  console.log(
    failed.length === 0
      ? "\n🎉 전체 PASS"
      : `\n⚠ ${failed.length}건 FAIL — 위 detail 확인.`,
  )
  process.exitCode = failed.length > 0 ? 1 : 0
}

run().catch((e) => {
  console.error("[예상치 못한 최상위 에러]", e)
  process.exitCode = 1
})
