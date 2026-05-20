/**
 * 초기화 직후 플레이스홀더 랜딩.
 *
 * 다음 단계(W1)에서 PRD(`docs/QUOTE_VIEWER_PRD.md`) 기반으로
 * - `/q/[slug]` (견적서 열람)
 * - `/q/[slug]/pdf` (PDF 생성)
 * - `/api/revalidate` (on-demand revalidate webhook)
 * 를 추가한다. 본 페이지(`/`)는 PRD IA 의 "랜딩(운영자용 소개)" 에 해당하며
 * 정식 디자인은 W2 작업 항목이다.
 */

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-muted-foreground text-sm">Quote Viewer MVP</p>
      <h1 className="text-3xl font-bold sm:text-4xl">초기화 완료</h1>
      <p className="text-muted-foreground leading-relaxed">
        견적서 도메인 라우트(<code>/q/[slug]</code>, <code>/q/[slug]/pdf</code>,
        <code>/api/revalidate</code>)는 다음 단계에서 추가됩니다.
        <br />
        단일 출처: <code>docs/QUOTE_VIEWER_PRD.md</code>.
      </p>
    </div>
  )
}
