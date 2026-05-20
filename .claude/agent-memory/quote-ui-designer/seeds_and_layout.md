---
name: seeds-and-layout
description: 견적서 시드 slug·페이지 셸 구조·QuoteView props 계약 (검증·후속 작업용)
metadata:
  type: project
---

견적서 뷰어 UI 작업에서 반복 사용하는 사실들.

- **시드 slug** (Playwright 검증용):
  - 활성: `36378466f72781dfa403cb8e2a719380` → 발행처 "Quote Viewer Dev", 고객사 "ABC 주식회사", 항목 2건(명함/로고), 총합계 **2,090,000원**. validUntil 2027-12-31(미만료).
  - 만료: `36378466f72781f09b60c3ccdd1ca592` → "XYZ 주식회사", 항목 1건, 총 550,000원. validUntil 2024-01-31 → 만료 배너 노출.
  - dev 포트 3000. `npm run dev` 후 `http://localhost:3000/q/<slug>`.

- **QuoteView props 계약**: `{ quote: Quote; items: QuoteItem[]; totals: QuoteTotals; itemsWarning: string | null; isExpired: boolean }` (`@/types`). 서버 컴포넌트, 표시 전용("use client" 금지).
- **데이터 흐름**: `app/q/[slug]/page.tsx`(셸, params 를 Suspense 안에서 await) → `quote-data.tsx`(`"use cache"`+`cacheLife("minutes")`+`cacheTag`, getQuoteBySlug/getQuoteItems/calculateTotals) → `<QuoteView/>`. 셸/캐시 지시자는 건드리지 말 것.
- **isExpired**: 정식은 T1.7 `lib/quotes.ts::isQuoteExpired()`(아직 미구현). 현재 quote-data.tsx 에서 임시로 `validUntil ? new Date(validUntil) < new Date() : false`.
- **clientContact** 는 MVP 에서 항상 null → "담당:" 줄은 조건부라 평소 미노출(future-safe 마크업만 유지).
- **부가세 0%면 부가세 행 숨김**(`taxRate > 0` 가드). Notion `금액`/`총금액` 컬럼은 읽지 않음 — totals/item.amount 가 SSOT.

연관: [[responsive-table-card]] [[base-ui-components]]
