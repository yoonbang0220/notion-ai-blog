import "server-only"

import { timingSafeEqual } from "node:crypto"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  signSession,
  verifySession,
  type AdminSessionPayload,
} from "@/lib/admin-session"

/**
 * 관리자 인증 게이트의 **서버 전용**(`server-only`) 진영(T3.1).
 *
 * 역할 분담(R13):
 *   - 세션 토큰 서명/검증(순수 Web Crypto)은 `lib/admin-session.ts` 에 두고 proxy(Edge 가능)와
 *     공유한다. 이 모듈은 그 위에 **Node 전용 기능**(비번 비교 `timingSafeEqual`, `cookies()`,
 *     `redirect()`)을 얹은 서버 컴포넌트·Route Handler·Server Action 전용 헬퍼다.
 *   - `import "server-only"` 가드 때문에 proxy 가 이 모듈을 import 하면 빌드가 깨진다. proxy 는
 *     반드시 `lib/admin-session.ts` 만 import 한다.
 *
 * 환경변수(둘 다 서버 전용 — `NEXT_PUBLIC_` 절대 금지):
 *   - `ADMIN_PASSWORD` — 로그인 비밀번호 평문(운영자가 `.env.local`/Vercel 에 설정).
 *   - `ADMIN_SESSION_SECRET` — 세션 HMAC 서명 키(강한 무작위 32자 이상 권장).
 */

/** 미설정 시 인증 자체가 불가능 → 즉시 throw(운영 설정 오류 신호). */
function requireAdminSecret(): string {
  const v = process.env.ADMIN_SESSION_SECRET
  if (!v) {
    throw new Error("환경변수 누락: ADMIN_SESSION_SECRET (관리자 세션 서명 키)")
  }
  return v
}

/** 미설정 시 throw. 로그인 비교 시점에만 호출. */
function requireAdminPassword(): string {
  const v = process.env.ADMIN_PASSWORD
  if (!v) {
    throw new Error("환경변수 누락: ADMIN_PASSWORD (관리자 로그인 비밀번호)")
  }
  return v
}

/**
 * 입력 비밀번호를 `ADMIN_PASSWORD` 와 **타이밍 안전**(`crypto.timingSafeEqual`) 비교한다.
 *
 * 단순 `===` 는 일치 길이만큼 조기 종료해 비교 시간이 입력에 의존(부채널). 길이가 다르면
 * 즉시 false(`timingSafeEqual` 은 동일 길이 버퍼만 허용). 선례: `app/api/revalidate/route.ts`.
 *
 * @param input 사용자가 제출한 비밀번호.
 * @returns 일치하면 true.
 */
export function verifyPassword(input: string): boolean {
  const expected = requireAdminPassword()
  const bufA = Buffer.from(input, "utf8")
  const bufB = Buffer.from(expected, "utf8")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** 새 세션 토큰을 발급한다(env secret 주입). 로그인 성공 시 호출. */
export function createSessionToken(): Promise<string> {
  return signSession(requireAdminSecret())
}

/**
 * 쿠키 저장소에서 세션 토큰을 읽어 검증한다. 유효하면 payload, 아니면 null.
 * (서버 컴포넌트·Route Handler 양쪽에서 사용 — `cookies()` 는 읽기 전용 OK.)
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies()
  const token = store.get(ADMIN_SESSION_COOKIE)?.value
  return verifySession(requireAdminSecret(), token)
}

/**
 * **2중 검증**(낙관적 게이트 보완, ROADMAP T3.1 5단계). 관리자 서버 컴포넌트가
 * 데이터(`queryPublishedQuotes`) 페치 **전에** 호출한다. 세션이 없거나 무효면
 * `/admin/login` 으로 redirect(견적 정보가 응답에 절대 포함되지 않도록).
 *
 * proxy 의 1차 차단을 우회·쿠키 조작한 요청에 대비한 서버 측 최종 방어선이다.
 */
export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession()
  if (!session) redirect("/admin/login")
  return session
}

/** 로그인 성공 시 세션 쿠키를 굽는다(httpOnly·secure·sameSite=lax·path=/, maxAge 30일). */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    // ⚠️ secure 쿠키는 HTTPS 에서만 전송된다. 로컬 dev 는 http://localhost 라
    //    production 에서만 true 로 둔다(C1 리뷰 반영). 안 그러면 로컬 로그인이 즉시 풀린다.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  })
}

/** 로그아웃 — 세션 쿠키를 삭제한다. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(ADMIN_SESSION_COOKIE)
}
