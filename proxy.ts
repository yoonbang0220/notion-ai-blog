import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { ADMIN_SESSION_COOKIE, verifySession } from "@/lib/admin-session"

/**
 * Proxy(구 middleware) — 두 가지 게이트를 담당한다.
 *
 * 1. **견적 경로 noindex(정합성 규칙 5)** — 모든 `/q/*` 응답에
 *    `X-Robots-Tag: noindex, nofollow, noarchive`. 페이지 `generateMetadata` 의
 *    `<meta name="robots">` 와 합쳐 2중 안전망. (robots.txt Disallow 는 T2.5.)
 *
 * 2. **관리자 인증 게이트(T3.1, R11 — 최상위 P0)** — `/admin/*` 응답에 noindex 헤더 강제 +
 *    미인증 접근 차단. `/admin/login`·`/admin/logout` 은 공개(진입점·세션 해제)라 예외.
 *    세션 쿠키를 검증해 실패하면 `/admin/login` 으로 redirect → 견적 URL 목록 유출 0.
 *    이는 **낙관적 1차 차단**이며, `/admin` 서버 컴포넌트가 데이터 페치 전에
 *    `requireAdminSession()` 으로 2중 검증한다(쿠키 조작·proxy 우회 대비).
 *
 * ⚠️ Next.js 16(현재 16.2.6)에서 `middleware` 파일 컨벤션은 deprecated → `proxy` 로
 *    이름이 바뀌었다(기능 동일). (출처: node_modules/next/dist/docs/.../proxy.md)
 *
 * ⚠️ R13 — Proxy 는 CDN/Edge 로 배포될 수 있고 Node 전용 API 사용이 권장되지 않는다.
 *    따라서 세션 검증은 `lib/admin-session.ts` 의 **순수 Web Crypto** 함수(`verifySession`)만
 *    쓰고, `server-only` 가 걸린 `lib/admin-auth.ts`(Node `timingSafeEqual`·`cookies()`)는
 *    절대 import 하지 않는다(import 시 server-only 가드로 빌드 실패).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1) 견적 경로 noindex ──
  if (pathname.startsWith("/q/")) {
    const response = NextResponse.next()
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
    return response
  }

  // ── 2) 관리자 경로 ──
  if (pathname.startsWith("/admin")) {
    // 공개 예외: 로그인(진입점)·로그아웃(세션 해제)은 인증 없이 통과. 단 noindex 는 동일 적용.
    const isPublicAdminPath =
      pathname === "/admin/login" || pathname === "/admin/logout"

    if (isPublicAdminPath) {
      const response = NextResponse.next()
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
      return response
    }

    // 보호 경로 — 세션 검증(Web Crypto). secret 미설정이면 검증 불가 → fail-closed(로그인으로).
    // ⚠️ 서버 컴포넌트 requireAdminSecret() 은 같은 상황에서 throw(500) 하지만, 1차 게이트는
    //    운영 중단 대신 차단으로 처리한다. 누락은 운영 설정 오류이므로 로그로 가시화(C2 리뷰 반영).
    const secret = process.env.ADMIN_SESSION_SECRET
    if (!secret) {
      console.error("[admin] ADMIN_SESSION_SECRET 미설정 — 모든 /admin 접근 차단")
    }
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    const session = secret ? await verifySession(secret, token) : null

    if (!session) {
      // 미인증/위조/만료 → 로그인으로 리다이렉트. 견적 정보는 응답에 일절 포함되지 않는다.
      const loginUrl = new URL("/admin/login", request.url)
      const response = NextResponse.redirect(loginUrl)
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
      return response
    }

    // 인증 통과 — noindex 만 적용하고 계속 진행.
    const response = NextResponse.next()
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
    return response
  }

  return NextResponse.next()
}

// matcher 는 정적 상수(배열)여야 빌드 타임 분석이 된다. 견적·관리자 경로에만 적용.
export const config = {
  matcher: ["/q/:path*", "/admin/:path*"],
}
