import { ExternalLink } from "lucide-react"

import { CopyLinkButton } from "@/components/admin/copy-link-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { QuoteListItem, QuoteStatus } from "@/types"

/**
 * 관리자 견적 목록(서버 컴포넌트, 표시 전용 — T3.3).
 *
 * - 데스크톱(≥640px): 시맨틱 `<table>`(헤더 제목/고객사/견적번호/발행일/상태/동작). 가로 스크롤 0.
 * - 모바일(<640px): 행을 카드로 분해. 가로 스크롤 0.
 * - 누락 필드는 "-" 표시. `slug` 형식 위반/누락 행은 [열람]·[복사] 비활성(잘못된 URL 방지, T3.2 연동).
 *
 * ⚠️ [복사] 동작은 **T3.4** 담당 — 지금은 비활성 자리표시자 버튼이다.
 * ⚠️ 색 하드코딩 금지 — globals.css oklch 토큰 유틸만(다크모드 자동 대응).
 * ⚠️ shadcn = `@base-ui/react`. `<a>` 렌더 버튼은 `render`/`nativeButton={false}` 패턴.
 */

export interface AdminQuoteListProps {
  quotes: QuoteListItem[]
}

/** 상태(코드 영문) → 한글 뱃지 라벨. */
const STATUS_LABEL: Record<QuoteStatus, string> = {
  Published: "발행",
  Draft: "초안",
  Archived: "보관",
}

/** ISO/날짜 문자열 → "YYYY. M. D.". null 이면 "-". date-only 는 TZ 시프트 없이 직접 파싱. */
function formatDate(iso: string | null): string {
  if (!iso) return "-"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (m) return `${m[1]}. ${Number(m[2])}. ${Number(m[3])}.`
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

/** 상태 뱃지(토큰 기반). */
function StatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span className="border-border bg-muted text-muted-foreground inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
      {STATUS_LABEL[status]}
    </span>
  )
}

/** 행/카드 동작: [열람](slug 있을 때 활성) + [복사](slug 있을 때 활성). */
function RowActions({
  slug,
  title,
}: {
  slug: string | null
  title: string | null
}) {
  // 스크린리더에서 행별로 어느 견적의 동작인지 구분되도록 라벨을 만든다(접근성, W1 리뷰 반영).
  const rowLabel = title ?? "제목 없는 견적"
  return (
    <div className="flex items-center gap-1">
      {slug ? (
        <Button
          render={
            <a href={`/q/${slug}`} target="_blank" rel="noopener noreferrer" />
          }
          nativeButton={false}
          variant="outline"
          size="sm"
          aria-label={`${rowLabel} 열람 (새 탭)`}
        >
          <ExternalLink aria-hidden="true" />
          열람
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          열람
        </Button>
      )}
      {/* slug 있을 때만 복사 활성(잘못된 URL 복사 방지). 없으면 비활성 자리표시자. */}
      {slug ? (
        <CopyLinkButton slug={slug} quoteLabel={rowLabel} />
      ) : (
        <Button variant="ghost" size="sm" disabled>
          복사
        </Button>
      )}
    </div>
  )
}

export function AdminQuoteList({ quotes }: AdminQuoteListProps) {
  if (quotes.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center text-sm">
          발행된 견적이 없습니다. Notion 에서 견적의 상태를 &ldquo;발행&rdquo; 으로
          바꾸면 여기에 표시됩니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">총 {quotes.length}건</p>

      {/* 데스크톱(≥640px): 시맨틱 table. 모바일에선 hidden → 가로 스크롤 0. */}
      <Card className="hidden sm:block">
        <CardContent className="px-0">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="border-border border-b">
                <th
                  scope="col"
                  className="text-muted-foreground px-4 py-2.5 text-left font-medium"
                >
                  제목
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-4 py-2.5 text-left font-medium"
                >
                  고객사
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-4 py-2.5 text-left font-medium"
                >
                  견적번호
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-4 py-2.5 text-left font-medium"
                >
                  발행일
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-4 py-2.5 text-left font-medium"
                >
                  상태
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-4 py-2.5 text-right font-medium"
                >
                  동작
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote, index) => (
                <tr
                  key={quote.slug ?? `row-${index}`}
                  className="border-border/60 border-b last:border-b-0"
                >
                  <td className="text-foreground px-4 py-3 align-middle font-medium">
                    {quote.title ?? "-"}
                  </td>
                  <td className="text-foreground px-4 py-3 align-middle">
                    {quote.clientCompany ?? "-"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 align-middle tabular-nums">
                    {quote.quoteNumber ?? "-"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 align-middle tabular-nums">
                    {formatDate(quote.issuedAt)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <div className="flex justify-end">
                      <RowActions slug={quote.slug} title={quote.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 모바일(<640px): 카드 리스트로 분해. */}
      <ul className="space-y-3 sm:hidden">
        {quotes.map((quote, index) => (
          <li key={quote.slug ?? `card-${index}`}>
            <Card>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-foreground font-medium">
                    {quote.title ?? "-"}
                  </p>
                  <StatusBadge status={quote.status} />
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground shrink-0">고객사</dt>
                    <dd className="text-foreground">
                      {quote.clientCompany ?? "-"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground shrink-0">견적번호</dt>
                    <dd className="text-foreground tabular-nums">
                      {quote.quoteNumber ?? "-"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground shrink-0">발행일</dt>
                    <dd className="text-foreground tabular-nums">
                      {formatDate(quote.issuedAt)}
                    </dd>
                  </div>
                </dl>
                <div className="pt-1">
                  <RowActions slug={quote.slug} title={quote.title} />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
