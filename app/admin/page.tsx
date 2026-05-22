import { Suspense } from "react"
import type { Metadata } from "next"

import { LogOut } from "lucide-react"

import { AdminQuoteList } from "@/components/admin/quote-list"
import { AdminQuoteListSkeleton } from "@/components/admin/quote-list-skeleton"
import { Button } from "@/components/ui/button"
import { requireAdminSession } from "@/lib/admin-auth"
import { queryPublishedQuotes } from "@/lib/quotes"

/**
 * 관리자 견적 목록 페이지(`/admin`, T3.3) — 인증 게이트 뒤의 운영자 화면.
 *
 * 구조(셸 + Suspense resolver): 정적 셸(제목·로그아웃)은 즉시 렌더하고, 동적 데이터
 * (세션 재검증 + Notion 페치)는 `<Suspense>` 안의 {@link AdminQuotesData} 에서 수행한다.
 *
 * ⚠️ R15 (cacheComponents 게이트): `requireAdminSession()`(cookies)·`queryPublishedQuotes()`
 *   (Notion) 는 모두 uncached 동적 접근이라 셸 본문에서 직접 await 하면
 *   `Uncached data was accessed outside of <Suspense>` 로 빌드가 깨진다. 반드시 Suspense
 *   경계 안에서만 호출한다. 레퍼런스: `app/q/[slug]/page.tsx`, `app/admin/login/page.tsx`.
 *   ⚠️ `"use cache"` 미사용(cookies 비호환 + 관리자 화면은 신선도 우선). `export const runtime` 금지.
 *
 * 보안(R11): proxy 가 미인증 `/admin` 을 1차 차단하지만, 쿠키 조작·proxy 우회 대비로
 *   데이터 페치 **전에** 서버에서 `requireAdminSession()` 2중 검증(실패 시 `/admin/login` redirect).
 *   정적 셸에는 견적 정보가 없으므로 우회 시에도 데이터 유출 0.
 *
 * noindex(규칙 5)는 proxy(`X-Robots-Tag`) + 아래 metadata 로 2중 강제.
 */
export const metadata: Metadata = {
  title: "견적 관리",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* 정적 셸 — 제목 + 로그아웃(견적 데이터 없음). */}
      <div className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
        <h1 className="text-foreground text-xl font-bold tracking-tight">
          견적 관리
        </h1>
        <Button
          render={<a href="/admin/logout" />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          <LogOut aria-hidden="true" />
          로그아웃
        </Button>
      </div>

      {/* 동적 데이터는 반드시 Suspense 안에서(Cache Components 규칙). */}
      <Suspense fallback={<AdminQuoteListSkeleton />}>
        <AdminQuotesData />
      </Suspense>
    </div>
  )
}

/**
 * 동적 데이터 컴포넌트(Suspense 경계 안). 세션 2중 검증 → 발행 견적 목록 페치 → 렌더.
 * 캐시 대상 아님(cookies + 신선도). 인증 실패 시 `requireAdminSession` 내부에서 redirect.
 */
async function AdminQuotesData() {
  await requireAdminSession() // ⚠️ 데이터 페치 전 2중 검증(R11)
  const quotes = await queryPublishedQuotes()
  return <AdminQuoteList quotes={quotes} />
}
