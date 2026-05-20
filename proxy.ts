import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * 견적서 경로(`/q/*`) 검색엔진 인덱싱 차단 — 정합성 규칙 5.
 *
 * 모든 `/q/*` 응답에 `X-Robots-Tag: noindex, nofollow, noarchive` 를 강제한다.
 * 페이지 `generateMetadata` 의 `<meta name="robots">` 와 합쳐 2중 안전망.
 * (robots.txt 전면 Disallow 는 T2.5 담당.)
 *
 * ⚠️ Next.js 16(현재 16.2.6)에서 `middleware` 파일 컨벤션은 **deprecated → `proxy`** 로
 *    이름이 바뀌었다(기능 동일). 따라서 `middleware.ts` 대신 `proxy.ts` + `proxy()` 함수를
 *    사용한다. (출처: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *    "The `middleware` file convention is deprecated and has been renamed to `proxy`.")
 *    ROADMAP/Shrimp 가이드의 `middleware.ts` 표기는 구버전 기준이다.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next()
  if (request.nextUrl.pathname.startsWith("/q/")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  }
  return response
}

// matcher 는 정적 상수여야 빌드 타임 분석이 된다. `/q/` 하위 전체에만 적용.
export const config = {
  matcher: "/q/:path*",
}
