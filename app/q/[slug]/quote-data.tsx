// ⚠️ Next.js 16.2.6 검증(2026-05-20): `cacheLife`/`cacheTag` 는 `next/cache` 의
//    **정식(stable)** export 다. `unstable_` 접두사는 더 이상 필요 없다.
//    (출처: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/{cacheLife,cacheTag}.md)
import { cacheLife, cacheTag } from "next/cache"
import { notFound } from "next/navigation"

import {
  calculateTotals,
  getQuoteBySlug,
  getQuoteItems,
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
 * ⚠️ 현재는 T1.6 의 `<QuoteView>` 가 아직 없어 **최소 임시 뷰**로 데이터를 출력한다.
 *    목적은 디자인이 아니라 "데이터가 화면 끝까지 흐르는지" 확인. 디자인·반응형·
 *    만료 배너(`isExpired`, T1.7)는 후속 태스크. 추후 `<QuoteView>` 로 교체한다.
 */
export async function QuoteData({ slug }: { slug: string }) {
  "use cache"
  cacheLife("minutes")
  cacheTag(`quote:${slug}`)

  const quote = await getQuoteBySlug(slug)
  if (!quote) notFound() // 규칙 3 — 형식 위반/미공개/없음 → 404

  const { items, warning } = await getQuoteItems(quote.pageId)
  const totals = calculateTotals(items, quote.taxRate)

  // ─── 임시 뷰(T1.6 에서 components/quote-view.tsx 로 교체) ───
  const won = new Intl.NumberFormat("ko-KR")
  const formatWon = (value: number) => `${won.format(value)}원`

  return (
    <article className="space-y-8">
      {/* 헤더 — 발행처/고객사/메타 */}
      <header className="space-y-1">
        {quote.title && (
          <h1 className="text-2xl font-bold">{quote.title}</h1>
        )}
        <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt>발행사</dt>
          <dd className="text-foreground">{quote.issuerCompany ?? "-"}</dd>
          <dt>고객사</dt>
          <dd className="text-foreground">{quote.clientCompany ?? "-"}</dd>
          <dt>견적번호</dt>
          <dd className="text-foreground">{quote.quoteNumber ?? "-"}</dd>
          <dt>발행일</dt>
          <dd className="text-foreground">{quote.issuedAt ?? "-"}</dd>
          <dt>유효기간</dt>
          <dd className="text-foreground">{quote.validUntil ?? "-"}</dd>
        </dl>
      </header>

      {/* 항목 페치 경고(0건/잘림) — 규칙 4. T1.6 에서 정식 배너로. */}
      {warning && (
        <p className="border-destructive/50 text-destructive rounded border px-3 py-2 text-sm">
          {warning}
        </p>
      )}

      {/* 항목 표 */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-2 font-medium">항목명</th>
            <th className="py-2 px-2 text-right font-medium">수량</th>
            <th className="py-2 px-2 text-right font-medium">단가</th>
            <th className="py-2 pl-2 text-right font-medium">금액</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.name}-${index}`} className="border-b">
              <td className="py-2 pr-2">{item.name}</td>
              <td className="py-2 px-2 text-right">{won.format(item.quantity)}</td>
              <td className="py-2 px-2 text-right">{formatWon(item.unitPrice)}</td>
              <td className="py-2 pl-2 text-right">{formatWon(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 합계 — 소계/부가세/총합계 */}
      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">소계</span>
          <span>{formatWon(totals.subtotal)}</span>
        </div>
        {quote.taxRate > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              부가세 ({quote.taxRate}%)
            </span>
            <span>{formatWon(totals.tax)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <span>총합계</span>
          <span>{formatWon(totals.total)}</span>
        </div>
      </div>

      {/* 비고 */}
      {quote.notes && (
        <section className="text-sm">
          <h2 className="mb-1 font-medium">비고</h2>
          <p className="text-muted-foreground whitespace-pre-line">
            {quote.notes}
          </p>
        </section>
      )}
    </article>
  )
}
