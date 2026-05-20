// ⚠️ Next.js 16.2.6 검증(2026-05-20): `cacheLife`/`cacheTag` 는 `next/cache` 의
//    **정식(stable)** export 다. `unstable_` 접두사는 더 이상 필요 없다.
//    (출처: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/{cacheLife,cacheTag}.md)
import { cacheLife, cacheTag } from "next/cache"
import { notFound } from "next/navigation"

import { QuoteView } from "@/components/quote-view"
import {
  calculateTotals,
  getQuoteBySlug,
  getQuoteItems,
  isQuoteExpired,
} from "@/lib/quotes"

/**
 * 견적 데이터 페치·계산을 격리한 서버 컴포넌트.
 *
 * `app/q/[slug]/page.tsx` 의 `<Suspense>` 안에서 렌더된다(Cache Components 규칙 —
 * 동적 데이터 페치는 Suspense 경계 내부에 있어야 빌드 통과).
 *
 * 캐시 전략(정합성/캐시 정책):
 *   - `"use cache"` — 견적 단건 출력 캐시.
 *   - `cacheLife("minutes")` — ISR 의도(분 단위 갱신). `revalidate` export 금지.
 *     ⚠️ slug 같은 동적 값을 cache 컴포넌트 안에서 직접 await 하지 않는다.
 *        셸(page.tsx)에서 await 한 slug 를 prop 으로 받아 캐시 키로 사용.
 *   - `cacheTag(`quote:${slug}`)` — on-demand 무효화 태그(W2 `/api/revalidate`).
 *
 * 데이터 흐름:
 *   1. `getQuoteBySlug` — 형식 위반/0건 → `null`, 중복 → throw(lib 내부 처리).
 *      `null` 이면 `notFound()` → `app/not-found.tsx`(404).
 *   2. `getQuoteItems` — 항목 N건 + warning(0건/잘림).
 *   3. `calculateTotals` — 소계/부가세/총합계(코드 계산, SSOT).
 *
 * 렌더는 T1.6 의 {@link QuoteView}(서버 컴포넌트, 표시 전용)에 위임한다.
 */
export async function QuoteData({ slug }: { slug: string }) {
  "use cache"
  cacheLife("minutes")
  cacheTag(`quote:${slug}`)

  const quote = await getQuoteBySlug(slug)
  if (!quote) notFound() // 규칙 3 — 형식 위반/미공개/없음 → 404

  const { items, warning } = await getQuoteItems(quote.pageId)
  const totals = calculateTotals(items, quote.taxRate)

  // 만료 판정(정합성 규칙 7). validUntil=null 시 console.warn 1회 + false 는
  // isQuoteExpired 헬퍼 내부에서 처리한다(T1.7).
  const isExpired = isQuoteExpired(quote)

  return (
    <QuoteView
      quote={quote}
      items={items}
      totals={totals}
      itemsWarning={warning}
      isExpired={isExpired}
    />
  )
}
