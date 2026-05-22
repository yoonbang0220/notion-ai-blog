/**
 * 관리자 세션 토큰 서명·검증 — **순수 Web Crypto(`crypto.subtle`)** 로만 구현(T3.1).
 *
 * ⚠️ 이 모듈에는 `import "server-only"` 를 **두지 않는다**. 두 곳에서 import 되기 때문이다:
 *   1. `proxy.ts` — Proxy(구 middleware)는 CDN/Edge 로 배포될 수 있어(R13) Node 전용 API
 *      (`node:crypto` 의 `timingSafeEqual` 등)를 쓸 수 없다. 따라서 세션 서명/검증은
 *      Edge·Node 양쪽에서 동작하는 Web Crypto 로만 구성한다.
 *   2. `lib/admin-auth.ts`(server-only) — 서버 컴포넌트·Route Handler 진영.
 *   `server-only` 가드가 걸리면 proxy import 시 빌드가 깨지므로 이 모듈은 가드 없이 둔다.
 *   대신 **비밀값을 직접 노출하는 export 를 두지 않고**, 서명/검증 함수만 제공한다.
 *
 * ⚠️ Node 전용 비번 비교(`crypto.timingSafeEqual`)는 이 모듈이 아니라 `lib/admin-auth.ts`
 *   (Node 런타임이 보장된 로그인 Route Handler/Server Action 경유)에서만 호출한다.
 *
 * 토큰 형식: `<base64url(payload-json)>.<base64url(hmac-sha256)>`
 *   - payload = `{ iat: number(초), exp: number(초) }` (단일 운영자 MVP — subject 불필요).
 *   - HMAC 키 = `ADMIN_SESSION_SECRET`(env). 서명은 payload **원문 문자열** 기준.
 *   - 검증: 서명 재계산 후 상수시간 비교(timing-safe) + `exp` 만료 확인.
 */

/** 세션 쿠키 이름(서버·proxy 공유 SSOT). */
export const ADMIN_SESSION_COOKIE = "admin_session"

/** 세션 유효기간(초). 30일 — 단일 운영자 본인 기기 가정(인수인계 확정값, 상수로 모음). */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

/** 세션 페이로드(서명 대상). 단일 운영자라 식별자 없이 발급/만료 시각만 둔다. */
export interface AdminSessionPayload {
  /** 발급 시각(epoch 초). */
  iat: number
  /** 만료 시각(epoch 초). 이후엔 검증 실패. */
  exp: number
}

/** UTF-8 인코더(모듈 1회 생성). */
const encoder = new TextEncoder()

/** base64url 인코딩(패딩 제거). Edge/Node 공통(`btoa`/`atob` 가용). */
function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * base64url 디코딩. 형식 오류 시 null(throw 대신 — 검증 실패로 흡수).
 *
 * 반환 타입을 `Uint8Array<ArrayBuffer>` 로 명시한다: `new Uint8Array(length)` 는 항상
 * `ArrayBuffer`(SharedArrayBuffer 아님)를 backing 으로 갖지만, TS 의 기본 추론은
 * `ArrayBufferLike` 로 넓게 잡아 `crypto.subtle.verify(BufferSource)` 인자와 충돌한다.
 */
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

/** HMAC-SHA256 키를 secret 으로부터 import(매 호출 생성 — 단순·안전). */
async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

/** payload 원문 문자열에 대한 HMAC-SHA256 서명(base64url). */
async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return toBase64Url(new Uint8Array(sig))
}

/**
 * 두 base64url 서명 문자열을 **상수 시간**으로 비교한다(부채널 차단).
 *
 * Web Crypto 의 `crypto.subtle.verify` 가 상수시간 검증을 제공하므로 그것을 쓴다
 * (Node `timingSafeEqual` 은 Edge 에서 불가 — R13). 길이가 다르면 즉시 false.
 */
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

/**
 * 세션 토큰을 발급한다. `now` 기준 `maxAgeSeconds` 동안 유효한 토큰 문자열을 반환.
 *
 * @param secret HMAC 키(`ADMIN_SESSION_SECRET`). 호출자가 env 에서 읽어 주입.
 * @param maxAgeSeconds 유효기간(초). 기본 {@link ADMIN_SESSION_MAX_AGE_SECONDS}.
 * @param now 기준 시각(테스트 주입용, 기본 현재).
 */
export async function signSession(
  secret: string,
  maxAgeSeconds: number = ADMIN_SESSION_MAX_AGE_SECONDS,
  now: Date = new Date(),
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000)
  const exp = iat + maxAgeSeconds
  const payload: AdminSessionPayload = { iat, exp }
  const payloadJson = JSON.stringify(payload)
  const payloadB64 = toBase64Url(encoder.encode(payloadJson))
  const signature = await hmacSign(secret, payloadB64)
  return `${payloadB64}.${signature}`
}

/**
 * 세션 토큰을 검증한다. 서명 위조·형식 오류·만료면 모두 `null`.
 *
 * @param secret HMAC 키. 발급 때와 동일해야 한다(다르면 서명 불일치 → null).
 * @param token 쿠키에서 읽은 토큰 문자열(없으면 호출 전 단계에서 null 처리).
 * @param now 기준 시각(테스트 주입용, 기본 현재).
 * @returns 유효하면 복원된 {@link AdminSessionPayload}, 아니면 `null`.
 */
export async function verifySession(
  secret: string,
  token: string | undefined | null,
  now: Date = new Date(),
): Promise<AdminSessionPayload | null> {
  if (!token) return null
  const dot = token.indexOf(".")
  if (dot <= 0 || dot === token.length - 1) return null // `payload.sig` 형식 아님
  const payloadB64 = token.slice(0, dot)
  const signature = token.slice(dot + 1)

  // 1) 서명 검증(상수시간) — 실패 시 즉시 무효.
  const ok = await hmacVerify(secret, payloadB64, signature)
  if (!ok) return null

  // 2) payload 파싱.
  const payloadBytes = fromBase64Url(payloadB64)
  if (!payloadBytes) return null
  let payload: AdminSessionPayload
  try {
    const json = new TextDecoder().decode(payloadBytes)
    const parsed = JSON.parse(json) as Partial<AdminSessionPayload>
    if (typeof parsed.iat !== "number" || typeof parsed.exp !== "number") {
      return null
    }
    payload = { iat: parsed.iat, exp: parsed.exp }
  } catch {
    return null
  }

  // 3) 만료 확인 — exp(초) <= now(초) 면 만료.
  const nowSec = Math.floor(now.getTime() / 1000)
  if (payload.exp <= nowSec) return null

  return payload
}
