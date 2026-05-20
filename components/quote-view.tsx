import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Quote, QuoteItem, QuoteTotals } from "@/types"

/**
 * 견적서 표시 컴포넌트 (서버 컴포넌트, 데이터 표시 전용).
 *
 * ⚠️ `"use client"` 금지 — 인터랙션 없음. 페치/계산은 호출부({@link QuoteData})가
 *    수행하고, 이 컴포넌트는 props 로 받은 값을 렌더만 한다.
 *
 * 레이아웃(PRD 와이어프레임 기준, A4 단일 컬럼):
 *   1. 헤더 — 발행처(로고는 텍스트) · 발행일 · 견적번호 · 유효기간 + 우상단 PDF 버튼
 *   2. 받는 분 — 고객사(담당자는 MVP 미사용 → 항상 null)
 *   3. 항목 — 데스크톱 `<table>` / 모바일 카드 리스트 (둘 다 가로 스크롤 0)
 *   4. 합계 — 소계 · 부가세(taxRate>0 일 때만) · 총합계(가장 강한 시각 요소)
 *   5. 비고
 *   6. 하단 PDF 버튼
 *
 * 정합성 배너 3종:
 *   - 규칙 2: 필수정보(title/issuerCompany/clientCompany) 누락 → 주의 배너
 *   - 규칙 4: itemsWarning != null → 항목 영역 주의 배너 + 빈 표/카드
 *   - 규칙 7: isExpired → 상단 만료 배너(role="alert"). 본문은 정상 노출.
 *
 * ⚠️ 색 하드코딩 금지 — globals.css oklch 토큰 유틸만 사용(다크모드 자동 대응).
 * ⚠️ 한글 폰트(Pretendard)는 T2.2 담당 — 기본 font-sans(Geist) 그대로.
 * ⚠️ Notion `금액`(formula)/`총금액`(rollup) 미사용 — totals/item.amount 가 SSOT.
 */

export interface QuoteViewProps {
  quote: Quote
  items: QuoteItem[]
  totals: QuoteTotals
  itemsWarning: string | null
  isExpired: boolean
}

/** 금액 포맷: 1,900,000원 (정수 원 단위). */
const wonFormatter = new Intl.NumberFormat("ko-KR")
const formatWon = (value: number) => `${wonFormatter.format(value)}원`
/** 수량 등 단위 없는 정수 포맷: 1,000. */
const formatNumber = (value: number) => wonFormatter.format(value)

/** 라벨-값 메타 행(헤더 dl 용). 값이 null 이면 "-" 표시. */
function MetaRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground">{value ?? "-"}</dd>
    </div>
  )
}

export function QuoteView({
  quote,
  items,
  totals,
  itemsWarning,
  isExpired,
}: QuoteViewProps) {
  // 규칙 2 — 필수정보 누락 판정(title/issuerCompany/clientCompany 중 하나라도 null).
  const hasMissingRequired =
    quote.title == null ||
    quote.issuerCompany == null ||
    quote.clientCompany == null

  // T2.3 에서 동작 연결될 PDF 다운로드 경로. 지금은 링크만(헤드리스 인쇄는 W2).
  const pdfHref = `/q/${quote.slug}/pdf`

  return (
    // data-print-region: T2.3 에서 ?print=1 분기로 버튼/배너 숨김 시 훅으로 사용.
    <article className="space-y-6" data-print-region="quote">
      {/* ── 정합성 배너(상단) ───────────────────────────────── */}
      {isExpired && (
        // 규칙 7 — 만료. 빨간 배너. 본문은 그대로 노출(차단은 Future).
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-medium"
          data-print-hide="true"
        >
          유효기간이 만료되었습니다.
        </div>
      )}
      {hasMissingRequired && (
        // 규칙 2 — 필수정보 누락. 주의 배너(토큰 기반: bg-muted).
        // 전용 "warning" 토큰이 없어 bg-muted + border 로 주의를 표현한다.
        <div
          role="status"
          className="bg-muted text-foreground border-border rounded-lg border px-4 py-3 text-sm"
          data-print-hide="true"
        >
          일부 필수 정보가 누락되어 표시되지 않은 항목이 있습니다.
        </div>
      )}

      {/* ── 헤더: 발행처 · 메타 · PDF 버튼(우상단) ───────────── */}
      <Card>
        <CardHeader className="grid-cols-[1fr_auto] items-start gap-4">
          <div className="space-y-3">
            {/* 발행처(로고는 텍스트). 가장 상단의 식별 요소. */}
            <p className="text-foreground text-xl font-bold tracking-tight">
              {quote.issuerCompany ?? "-"}
            </p>
            <dl className="space-y-1 text-sm">
              <MetaRow label="발행일" value={quote.issuedAt} />
              <MetaRow label="견적번호" value={quote.quoteNumber} />
              <MetaRow label="유효기간" value={quote.validUntil} />
            </dl>
          </div>
          {/* 우상단 PDF 버튼(동작은 T2.3). 인쇄 시 숨김 대상. */}
          {/* nativeButton=false — base-ui Button 을 <a> 로 렌더(비-button 엘리먼트). */}
          <Button
            render={<a href={pdfHref} />}
            nativeButton={false}
            variant="outline"
            size="sm"
            data-print-hide="true"
          >
            <Download aria-hidden="true" />
            PDF 다운로드
          </Button>
        </CardHeader>
      </Card>

      {/* ── 받는 분(고객사) ─────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-1 py-1">
          <p className="text-muted-foreground text-sm">받는 분</p>
          <p className="text-foreground text-base font-semibold">
            {quote.clientCompany ?? "-"}
          </p>
          {/* 담당자(clientContact)는 MVP 에서 항상 null → 평소엔 미노출. */}
          {quote.clientContact && (
            <p className="text-muted-foreground text-sm">
              담당: {quote.clientContact}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 견적 항목 ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>견적 항목</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemsWarning && (
            // 규칙 4 — 항목 경고(0건/잘림). 주의 배너 + 빈 표/카드.
            <div
              role="status"
              className="border-destructive/50 text-destructive rounded-lg border px-4 py-3 text-sm"
            >
              {itemsWarning}
            </div>
          )}

          {/* 데스크톱(≥640px): 시맨틱 table. 모바일에선 hidden → 가로 스크롤 0. */}
          <table className="hidden w-full table-auto border-collapse text-sm sm:table">
            <thead>
              <tr className="border-border border-b">
                <th
                  scope="col"
                  className="text-muted-foreground py-2 pr-3 text-left font-medium"
                >
                  항목명
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-3 py-2 text-right font-medium"
                >
                  수량
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-3 py-2 text-right font-medium"
                >
                  단가
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground py-2 pl-3 text-right font-medium"
                >
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={`${item.name}-${index}`}
                  className="border-border/60 border-b last:border-b-0"
                >
                  <td className="text-foreground py-2.5 pr-3 align-top">
                    <div className="font-medium">{item.name}</div>
                    {item.note && (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {item.note}
                      </div>
                    )}
                  </td>
                  <td className="text-foreground py-2.5 px-3 text-right align-top tabular-nums">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="text-foreground py-2.5 px-3 text-right align-top tabular-nums">
                    {formatWon(item.unitPrice)}
                  </td>
                  <td className="text-foreground py-2.5 pl-3 text-right align-top font-medium tabular-nums">
                    {formatWon(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 모바일(<640px): 카드 리스트로 분해(항목명 + 수량 × 단가 = 금액). */}
          <ul className="space-y-3 sm:hidden">
            {items.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="border-border rounded-lg border px-3 py-3"
              >
                <p className="text-foreground font-medium">{item.name}</p>
                {item.note && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {item.note}
                  </p>
                )}
                <div className="text-muted-foreground mt-2 flex items-center justify-between text-sm">
                  <span className="tabular-nums">
                    {formatNumber(item.quantity)} × {formatWon(item.unitPrice)}
                  </span>
                  <span className="text-foreground font-semibold tabular-nums">
                    {formatWon(item.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* 항목 0건 — 빈 표/카드 대신 안내. (warning 배너는 위에서 노출됨) */}
          {items.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              표시할 항목이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 합계 ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="py-1">
          <dl className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">소계</dt>
              <dd className="text-foreground tabular-nums">
                {formatWon(totals.subtotal)}
              </dd>
            </div>
            {/* 부가세 0%면 행 숨김(규칙). */}
            {quote.taxRate > 0 && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  부가세 ({quote.taxRate}%)
                </dt>
                <dd className="text-foreground tabular-nums">
                  {formatWon(totals.tax)}
                </dd>
              </div>
            )}
            <Separator className="my-1" />
            {/* 총합계 — 페이지에서 가장 강한 시각 요소(크기·굵기). */}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-foreground text-base font-bold">총 합계</dt>
              <dd className="text-foreground text-2xl font-extrabold tracking-tight tabular-nums">
                {formatWon(totals.total)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── 비고 ────────────────────────────────────────────── */}
      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle>비고 / 결제 조건</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm whitespace-pre-line">
              {quote.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── 하단 PDF 버튼 ───────────────────────────────────── */}
      <div className="flex justify-center pt-2" data-print-hide="true">
        <Button
          render={<a href={pdfHref} />}
          nativeButton={false}
          variant="default"
          size="lg"
        >
          <Download aria-hidden="true" />
          PDF 다운로드
        </Button>
      </div>
    </article>
  )
}
