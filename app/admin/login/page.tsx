import { Suspense } from "react"

import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAdminSession } from "@/lib/admin-auth"
import { LoginForm } from "./login-form"

/**
 * 관리자 로그인 페이지(`/admin/login`) — 인증 게이트의 **공개 진입점**(T3.1).
 *
 * proxy 의 `/admin/:path*` 게이트에서 `/admin/login` 만 예외로 허용된다(미인증도 접근 가능).
 * 이미 로그인한 상태로 들어오면 곧장 `/admin` 으로 보낸다(UX, {@link RedirectIfAuthenticated}).
 *
 * ⚠️ **셸 + Suspense resolver 패턴**(R15, cacheComponents 게이트): `getAdminSession()` 은
 *    `cookies()`(uncached dynamic)를 읽으므로 셸 본문에서 직접 await 하면
 *    `Uncached data was accessed outside of <Suspense>` 로 빌드가 막힌다(T1.5 함정과 동일).
 *    → 정적 셸(로그인 카드)은 그대로 두고, 세션 검사·리다이렉트는 `<Suspense>` 안의
 *    resolver 로 분리한다. 레퍼런스: `app/q/[slug]/page.tsx`.
 *
 * 폼·인터랙션은 `login-form.tsx`(클라이언트)로 분리하고, 이 페이지는 얇은 서버 래퍼다.
 * 색은 토큰만 사용(하드코딩 0). 다크모드는 기존 토큰으로 자동 대응.
 */
export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      {/* 이미 유효 세션이면 /admin 으로(편의). 동적(cookies) 접근이라 Suspense 안에 둔다. */}
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>운영자 로그인</CardTitle>
          <CardDescription>
            견적 목록·공유 링크 관리 화면에 접근하려면 로그인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}

/**
 * 이미 로그인한 사용자를 `/admin` 으로 보내는 동적 resolver. `<Suspense>` 안에서만 렌더.
 * 미인증이면 아무것도 그리지 않아(`null`) 정적 로그인 카드가 그대로 노출된다.
 */
async function RedirectIfAuthenticated() {
  const session = await getAdminSession()
  if (session) redirect("/admin")
  return null
}
