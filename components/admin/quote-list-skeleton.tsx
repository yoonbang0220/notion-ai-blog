/**
 * 관리자 견적 목록 로딩 스켈레톤 (T3.3).
 *
 * `app/admin/page.tsx` 의 `<Suspense fallback>` 으로 사용된다. 세션 재검증 + Notion
 * 페치가 streaming 으로 채워지기 전 잠깐 노출되는 정적 회색 박스. 색은 토큰만 사용.
 */
export function AdminQuoteListSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="bg-muted h-4 w-16 rounded" />
      <div className="bg-card ring-foreground/10 space-y-3 rounded-xl p-4 ring-1">
        <div className="bg-muted h-9 w-full rounded" />
        <div className="bg-muted h-9 w-full rounded" />
        <div className="bg-muted h-9 w-full rounded" />
      </div>
    </div>
  )
}
