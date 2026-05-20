/**
 * 견적서 데이터 로딩 placeholder.
 *
 * `app/q/[slug]/page.tsx` 의 `<Suspense fallback>` 으로 사용된다.
 * 데이터 컴포넌트({@link QuoteData})가 streaming 으로 채워지기 전 잠깐 노출되는
 * 정적 스켈레톤(회색 박스). 디자인은 T1.6 에서 본문과 함께 정돈한다.
 */
export function QuoteSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      {/* 헤더(발행처/고객사) 영역 */}
      <div className="space-y-3">
        <div className="bg-muted h-7 w-2/3 rounded" />
        <div className="bg-muted h-4 w-1/3 rounded" />
        <div className="bg-muted h-4 w-1/2 rounded" />
      </div>

      {/* 항목 표 영역 */}
      <div className="space-y-2">
        <div className="bg-muted h-10 w-full rounded" />
        <div className="bg-muted h-10 w-full rounded" />
        <div className="bg-muted h-10 w-full rounded" />
      </div>

      {/* 합계 영역 */}
      <div className="flex flex-col items-end space-y-2">
        <div className="bg-muted h-5 w-40 rounded" />
        <div className="bg-muted h-5 w-40 rounded" />
        <div className="bg-muted h-7 w-48 rounded" />
      </div>
    </div>
  )
}
