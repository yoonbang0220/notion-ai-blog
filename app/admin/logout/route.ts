import { redirect } from "next/navigation"

import { clearSessionCookie } from "@/lib/admin-auth"

/**
 * 로그아웃 Route Handler(`/admin/logout`) — 세션 쿠키 삭제 후 `/admin/login` 이동(T3.1).
 *
 * GET 으로 처리해 헤더의 로그아웃 링크(`<a href="/admin/logout">`)로 간단히 호출한다.
 * 단일 운영자 MVP 라 CSRF 부담이 낮고, 쿠키 삭제는 파괴적이지 않다(재로그인으로 복구).
 *
 * ⚠️ `redirect()` 는 throw 라 try/catch 밖에서 호출. cookies().delete 는 Route Handler 에서 허용.
 * ⚠️ `export const runtime` 금지(cacheComponents 충돌) — 기본 nodejs 런타임 사용.
 */
export async function GET(): Promise<Response> {
  await clearSessionCookie()
  redirect("/admin/login")
}
