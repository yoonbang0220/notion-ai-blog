/**
 * 도메인 타입 정의.
 *
 * - `ThemeMode`: 도메인 무관 공통 타입.
 * - `Quote` / `QuoteItem` / `QuoteTotals` / `QuoteStatus`: Notion 기반 견적서 도메인 타입.
 *   `lib/quotes.ts`(페치·정규화·합계), `components/quote-view.tsx`(렌더) 가 공유한다.
 *
 * 본 파일은 **타입 선언만** 둔다. 런타임 함수·계산 로직은 `lib/quotes.ts` 로 분리.
 */

/** 테마 모드 (next-themes). 도메인 무관. */
export type ThemeMode = "light" | "dark" | "system"

/**
 * 견적 발행 상태(코드 도메인, 영문). Notion `상태`(select) 옵션과 매핑:
 * `발행`→`Published`, `초안`→`Draft`, `보관`→`Archived` (lib/quotes.ts `STATUS`).
 * `Published` 만 `/q/[slug]` 에 노출되며 `Draft`/`Archived` 는 404.
 */
export type QuoteStatus = "Draft" | "Published" | "Archived"

/**
 * 견적 1건의 메타데이터. Notion `Quotes` DB 행 ↔ 1:1 정규화 결과.
 *
 * Notion 속성명은 한글이다(Path B). 아래 JSDoc 의 백틱 이름이 **실제 Notion 키**.
 * 코드는 `lib/quotes.ts` `PROP` 매핑으로 한글 키 → 영문 TS 필드 변환.
 *
 * 정합성 규칙(PRD/CLAUDE.md):
 * - 필수 5속성(`title`/`slug`/`status`/`issuerCompany`/`clientCompany`) 누락 시
 *   `console.warn` + "필수 정보 누락" 배너. throw 하지 않는다(규칙 2).
 * - 따라서 `slug` 를 제외한 나머지는 모두 `null` 허용.
 * - `slug` 만 `string` 필수 — 형식 위반(32자 미만·영숫자 외)은 페치 단계에서
 *   `getQuoteBySlug` 가 `null` 반환(→ 404)으로 처리(규칙 3). 즉 유효한 `Quote`
 *   객체가 만들어진 시점의 `slug` 는 항상 검증 통과한 문자열이다.
 * - `subtotal`/`tax`/`total` 은 이 타입에 **저장하지 않는다**. 항상 `QuoteItem[]`
 *   에서 코드로 재계산(`QuoteTotals`) → 이중 진실 원천 방지(규칙 6).
 */
export interface Quote {
  /** Notion 페이지 ID. 항목(`항목`) 페치 시 relation 필터 키로 사용. */
  pageId: string
  /** Notion `제목`(title). 내부 식별용(클라이언트 미노출). 누락 시 null. */
  title: string | null
  /** Notion `슬러그`(formula). URL 경로 `/q/[slug]`. 32자 hex, 형식 검증 통과값. */
  slug: string
  /** Notion `상태`(select). `발행`→`Published` 만 노출. */
  status: QuoteStatus
  /** Notion `고객사`(rich_text). 받는 분 회사명. 누락 시 null. */
  clientCompany: string | null
  /** 받는 분 담당자. Notion 에 해당 속성 부재(MVP 제외) → 항상 null. */
  clientContact: string | null
  /** Notion `발행사`(rich_text). 운영자 본인 회사명. 누락 시 null. */
  issuerCompany: string | null
  /** Notion `견적번호`(rich_text). 예: `Q-2026-0001`. 누락 시 null. */
  quoteNumber: string | null
  /** Notion `발행일`(date). 발행일 ISO 8601. 누락 시 null. */
  issuedAt: string | null
  /** Notion `유효기간`(date). ISO 8601. 지나면 만료 배너(규칙 7). 누락 시 null. */
  validUntil: string | null
  /**
   * Notion `부가세율`(number). 부가세율(%). 기본 10.
   * `0` 입력 시 부가세 행 숨김. 필수 — 누락 시 정규화 단계에서 기본값 10 주입.
   */
  taxRate: number
  /** Notion `비고`(rich_text, multi-line). 비고/결제 조건 자유 텍스트. 누락 시 null. */
  notes: string | null
}

/**
 * 견적 항목 1행. Notion `Items` DB 행(또는 page body table 행) ↔ 1:1 정규화 결과.
 *
 * 정합성 규칙:
 * - `quantity`/`unitPrice` 가 null 인 행은 `0` 으로 처리 + `console.warn`(규칙 4).
 *   (`parseIntSafe` → `NaN` 시 0)
 * - `amount` 는 Notion `금액`(formula) 를 **읽지 않고** 코드에서 계산한다(규칙 6).
 */
export interface QuoteItem {
  /** Notion `항목명`(title). 항목명. 예: `로고 디자인`. */
  name: string
  /** Notion `수량`(number). 수량. null/NaN → 0. */
  quantity: number
  /** Notion `단가`(number). 단가(원 단위 정수). null/NaN → 0. */
  unitPrice: number
  /** Notion `비고`(rich_text). 비고(선택). 없으면 null. */
  note: string | null
  /** 코드 계산값: `quantity * unitPrice`. Notion 저장 금지. */
  amount: number
}

/**
 * 관리자 목록(`/admin`, Phase 3 / T3.2)용 **경량** 견적 행.
 *
 * `queryPublishedQuotes()`(lib/quotes.ts) 가 발행 견적을 이 형태로 정규화한다.
 * ⚠️ 항목(`QuoteItem[]`)·합계(`QuoteTotals`)·`notes` 는 **포함하지 않는다** —
 *   목록 화면엔 불필요하고, 견적마다 Items DB 를 조회하면 N+1 호출이 된다(회귀 가드).
 *
 * 정합성(T3.2):
 *   - 필수 속성(`title`/`clientCompany`/`quoteNumber`/`issuedAt`) 누락 행은 `console.warn`
 *     후 해당 필드를 `null` 로 둔다(UI 가 "-" 표시). 목록에서 제외하지는 않는다.
 *   - `slug` 형식 위반(`SLUG_PATTERN` 불통과) 행은 `slug=null` — UI 가 [복사] 버튼을
 *     비활성화해 잘못된 URL 복사를 막는다.
 */
export interface QuoteListItem {
  /** Notion `슬러그`(formula). 형식 위반 시 null(UI [복사] 비활성). */
  slug: string | null
  /** Notion `제목`(title). 내부 식별용. 누락 시 null. */
  title: string | null
  /** Notion `고객사`(rich_text). 누락 시 null. */
  clientCompany: string | null
  /** Notion `견적번호`(rich_text). 예: `Q-2026-0001`. 누락 시 null. */
  quoteNumber: string | null
  /** Notion `발행일`(date). ISO 8601. 목록 정렬 키(내림차순). 누락 시 null(맨 뒤). */
  issuedAt: string | null
  /** Notion `상태`(select). 목록은 `Published` 만이지만 뱃지 표시용으로 보존. */
  status: QuoteStatus
}

/**
 * 견적 합계. `QuoteItem[]` + `taxRate` 에서 코드로 계산한 파생값(규칙 6).
 * 세 값 모두 정수 원 단위(반올림). Notion 속성으로 저장하지 않는다.
 */
export interface QuoteTotals {
  /** 소계: `Σ items.amount`. 정수 원. */
  subtotal: number
  /** 부가세: `Math.round(subtotal * taxRate / 100)`. 정수 원. */
  tax: number
  /** 총합계: `subtotal + tax`. 정수 원. */
  total: number
}
