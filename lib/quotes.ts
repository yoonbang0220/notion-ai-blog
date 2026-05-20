import "server-only"

import { Client, isFullDatabase, isFullPage } from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"

import type { Quote, QuoteItem, QuoteStatus, QuoteTotals } from "@/types"

/**
 * 견적(Invoice)·항목(Items) Notion DB 페치 레이어. **서버 전용**(`server-only` 가드).
 *
 * 진입점:
 *   - {@link getQuoteBySlug} — slug 로 발행된 견적 1건(메타데이터).
 *   - {@link getQuoteItems} — invoiceId(견적 페이지 ID) 로 항목 N건(Items DB).
 *   - {@link calculateTotals} — 항목 + 부가세율 → 소계/부가세/총합계(코드 계산).
 *
 * ⚠️ Path B (2026-05-20): 운영자가 Notion 속성·상태값을 **한글로 생성**.
 *   - 속성명 매핑: {@link PROP}(Invoice) / {@link ITEM_PROP}(Items) (TS 필드 → 한글 Notion 키)
 *   - 상태값 매핑: {@link STATUS} (한글 → 영문 {@link QuoteStatus})
 *   영문 키(`"Title"`/`"Status"` 등) 하드코딩 금지 — 실제 DB 에 없어 즉시 실패.
 *
 * ⚠️ `슬러그`/`금액`/`총금액` 은 Notion **formula/rollup** 타입.
 *   - 슬러그 읽기는 {@link getFormulaString}, 필터는 `formula: { string: { equals } }`.
 *   - 금액(Items.`금액` formula)/총금액(Invoice.`총금액` rollup) 은 절대 읽지 않는다
 *     (코드 자체 계산이 SSOT — 정합성 규칙 6).
 *
 * ⚠️ Items 항목은 **별도 `Items` DB** 행이며 `견적`(relation) 속성으로 Invoice 와 연결된다
 *   (2026-05-17 도메인 결정. ROADMAP T1.3 의 page body `table` 블록 파싱 설명은 구버전 — 무시).
 *   필터: `relation: { contains: invoiceId }`, 정렬: `created_time` 오름차순.
 */

/** 환경변수 필수 로드. 누락 시 모듈 로드(=dev/build 부팅) 시점에 즉시 throw. */
function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`환경변수 누락: ${name}`)
  return v
}

/** 견적 메타 TS 필드 → 실제 Notion 속성명(한글). */
const PROP = {
  title: "제목",
  status: "상태",
  slug: "슬러그",
  clientCompany: "고객사",
  issuerCompany: "발행사",
  quoteNumber: "견적번호",
  issuedAt: "발행일",
  validUntil: "유효기간",
  taxRate: "부가세율",
  notes: "비고",
} as const

/** 항목(Items) TS 필드 → 실제 Notion 속성명(한글). */
const ITEM_PROP = {
  name: "항목명",
  invoice: "견적",
  quantity: "수량",
  unitPrice: "단가",
  note: "비고",
} as const

/** Notion `상태` select 옵션(한글) → 코드 도메인 {@link QuoteStatus}(영문). */
const STATUS: Record<string, QuoteStatus> = {
  초안: "Draft",
  발행: "Published",
  보관: "Archived",
}

/** 노출 게이트(규칙: `발행`=Published 만 노출). 필터 비교값. */
const STATUS_PUBLISHED_KO = "발행"

/** slug 형식: 영숫자/`_`/`-` 32자 이상. 위반 시 페치 단계 404(규칙 3). */
const SLUG_PATTERN = /^[A-Za-z0-9_-]{32,}$/

// 모듈 스코프 1회 생성. 토큰 누락 시 여기서 즉시 throw(부팅 실패 = 의도).
const notion = new Client({ auth: requireEnv("NOTION_TOKEN") })
const DATABASE_ID = requireEnv("NOTION_DATABASE_ID")
const ITEMS_DATABASE_ID = requireEnv("NOTION_ITEMS_DATABASE_ID")

// data source id 는 첫 호출 시점에 lazy 캐시(모듈 로드 시점 아님). DB 별로 별도 캐시.
let cachedDataSourceId: string | null = null
let cachedItemsDataSourceId: string | null = null

/** v5 2단계 패턴: databases.retrieve → data_sources[0].id. 결과 캐시(공통 로직). */
async function resolveDataSource(databaseId: string): Promise<string> {
  const db = await notion.databases.retrieve({ database_id: databaseId })
  if (!isFullDatabase(db)) throw new Error(`Notion DB partial 응답 — ${databaseId}`)
  const id = db.data_sources[0]?.id
  if (!id) throw new Error(`Notion DB(${databaseId}) 에 data source 가 없습니다.`)
  return id
}

/** 견적(Invoice) DB 의 data source id (lazy 캐시). */
async function resolveDataSourceId(): Promise<string> {
  if (cachedDataSourceId) return cachedDataSourceId
  cachedDataSourceId = await resolveDataSource(DATABASE_ID)
  return cachedDataSourceId
}

/** 항목(Items) DB 의 data source id (lazy 캐시). Invoice 와 별도 캐시. */
async function resolveItemsDataSourceId(): Promise<string> {
  if (cachedItemsDataSourceId) return cachedItemsDataSourceId
  cachedItemsDataSourceId = await resolveDataSource(ITEMS_DATABASE_ID)
  return cachedItemsDataSourceId
}

/**
 * slug 로 **발행된** 견적 1건을 조회한다.
 *
 * - 형식 위반 slug → Notion 호출 없이 `null`(규칙 3 → 라우트에서 404).
 * - 0건 → `null`(404). 2건 이상 → `throw`(규칙 1, 데이터 손상 신호).
 *
 * ⚠️ **`슬러그` formula 는 서버 필터가 불가능하다**(2026-05-20 실측, requestId 3건 확인).
 *   `슬러그` 는 `replaceAll(id(), "-", "")` formula 인데, Notion 필터 엔진이 이 formula 의
 *   출력 타입을 결정하지 못해 `formula: { string: { equals } }` / `rich_text: { equals }`
 *   모두 `validation_error: Unable to filter based on a formula of unknown type` 로 실패한다.
 *   (페이지 응답에서는 `formula.type === "string"` 으로 정상 평가됨.)
 *   → `상태=발행` 으로만 서버 필터링한 뒤 **코드 측에서 slug 동등 비교**한다. 발행 견적 수가
 *   적은 MVP 규모(운영자 월 5~10건)에서 충분하며, `start_cursor` 페이지네이션으로 전수 확인한다.
 *
 * @returns 정규화된 {@link Quote}, 없으면 `null`.
 */
export async function getQuoteBySlug(slug: string): Promise<Quote | null> {
  if (!SLUG_PATTERN.test(slug)) return null // 규칙 3 — Notion 호출 없음
  const dataSourceId = await resolveDataSourceId()
  const matches: PageObjectResponse[] = []
  let startCursor: string | undefined = undefined
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: PROP.status, select: { equals: STATUS_PUBLISHED_KO } },
      page_size: 100,
      start_cursor: startCursor,
    })
    for (const page of res.results) {
      if (!isFullPage(page)) continue
      if (getFormulaString(page.properties[PROP.slug]) === slug) matches.push(page)
    }
    startCursor = res.has_more && res.next_cursor ? res.next_cursor : undefined
    // 중복(2건 이상) 확정 시 더 볼 필요 없음(규칙 1 → throw).
  } while (startCursor && matches.length < 2)
  if (matches.length === 0) return null // 규칙 3 → 404
  if (matches.length >= 2) throw new Error(`Duplicate slug: ${slug}`) // 규칙 1
  return normalizeQuote(matches[0])
}

/** Notion 페이지 응답 → {@link Quote}. 필수 속성 누락 시 warn(규칙 2, throw 금지). */
function normalizeQuote(page: PageObjectResponse): Quote {
  const p = page.properties
  const title = getTitleText(p[PROP.title])
  const slug = getFormulaString(p[PROP.slug])
  const rawStatus = getSelect(p[PROP.status]) // "발행" 기대(필터가 보장)
  const status: QuoteStatus =
    rawStatus && STATUS[rawStatus] ? STATUS[rawStatus] : "Published"
  const clientCompany = getRichText(p[PROP.clientCompany])
  const issuerCompany = getRichText(p[PROP.issuerCompany])
  const quoteNumber = getRichText(p[PROP.quoteNumber])
  const issuedAt = getDate(p[PROP.issuedAt])
  const validUntil = getDate(p[PROP.validUntil])
  const taxRate = getNumber(p[PROP.taxRate]) ?? 10
  const notes = getRichText(p[PROP.notes])

  // 규칙 2: 필수 5속성(title/slug/status/issuerCompany/clientCompany) 누락 경고.
  // status 는 매핑 전 한글 원본(rawStatus) 로 존재 여부 판정.
  const required: Record<string, unknown> = {
    title,
    slug,
    status: rawStatus,
    issuerCompany,
    clientCompany,
  }
  for (const [key, value] of Object.entries(required)) {
    if (!value) console.warn(`[quote ${page.id}] 필수 속성 누락: ${key}`)
  }

  return {
    pageId: page.id,
    title,
    slug: slug ?? "",
    status,
    clientCompany,
    // 받는 분 담당자: Notion 에 속성 부재(MVP 제외) → 항상 null.
    clientContact: null,
    issuerCompany,
    quoteNumber,
    issuedAt,
    validUntil,
    taxRate,
    notes,
  }
}

/**
 * 견적 1건(invoiceId)에 속한 항목(Items DB 행)들을 페치·정규화한다.
 *
 * 항목은 별도 `Items` DB 행이며 `견적`(relation) 속성으로 Invoice 와 연결된다
 * (ROADMAP T1.3 의 page body table 파싱 설명은 구버전 — 무시).
 *
 * - 필터: `relation: { contains: invoiceId }`, 정렬: `created_time` 오름차순.
 * - `start_cursor`/`has_more` 페이지네이션 루프(MVP 가정 ≤30 이나 안전 처리).
 *   루프 안전장치(MAX_ITEMS_PAGES) 도달 시 일부 항목 누락 → warning 에 기록(ROADMAP R1).
 * - 행별 `금액`(formula) 은 읽지 않고 `quantity * unitPrice` 자체 계산(규칙 6).
 * - `수량`/`단가` 가 null/NaN 인 행은 0 처리 + `console.warn`(행 식별자 포함, 규칙 4).
 * - 항목 0건이면 `{ items: [], warning: "항목이 없습니다." }`(규칙 4).
 *
 * @param invoiceId 견적(Invoice) Notion 페이지 ID. {@link Quote.pageId}.
 * @returns 정규화된 {@link QuoteItem} 배열 + 경고 메시지(없으면 null).
 */
export async function getQuoteItems(
  invoiceId: string,
): Promise<{ items: QuoteItem[]; warning: string | null }> {
  const dataSourceId = await resolveItemsDataSourceId()
  const pages: PageObjectResponse[] = []
  let startCursor: string | undefined = undefined
  let truncated = false

  // 페이지네이션 루프. 무한 루프 방지용 상한(100건/page × 50page = 5000행).
  const MAX_ITEMS_PAGES = 50
  for (let i = 0; i < MAX_ITEMS_PAGES; i++) {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: ITEM_PROP.invoice, relation: { contains: invoiceId } },
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
      page_size: 100,
      start_cursor: startCursor,
    })
    for (const page of res.results) {
      if (isFullPage(page)) pages.push(page)
    }
    if (!res.has_more || !res.next_cursor) break
    startCursor = res.next_cursor
    if (i === MAX_ITEMS_PAGES - 1) truncated = true // 상한 도달 + 아직 has_more
  }

  if (pages.length === 0) {
    return { items: [], warning: "항목이 없습니다." } // 규칙 4
  }

  const items = pages.map((page) => normalizeItem(page))
  const warning = truncated
    ? `항목이 너무 많아 일부만 표시됩니다(최대 ${MAX_ITEMS_PAGES * 100}행).`
    : null
  return { items, warning }
}

/** Notion `Items` 페이지 응답 → {@link QuoteItem}. 수량/단가 null → 0 + warn(규칙 4). */
function normalizeItem(page: PageObjectResponse): QuoteItem {
  const p = page.properties
  const name = getTitleText(p[ITEM_PROP.name]) ?? ""
  const rawQuantity = getNumber(p[ITEM_PROP.quantity])
  const rawUnitPrice = getNumber(p[ITEM_PROP.unitPrice])
  const note = getRichText(p[ITEM_PROP.note])

  // 규칙 4: 수량/단가 null/NaN → 0 처리 + 행 식별자(항목명 또는 page id) 포함 경고.
  // Number.isFinite 로 null·NaN·Infinity 를 동일 기준으로 판정(경고/0 처리 일치).
  const rowLabel = name || page.id
  const quantity = Number.isFinite(rawQuantity) ? (rawQuantity as number) : 0
  const unitPrice = Number.isFinite(rawUnitPrice) ? (rawUnitPrice as number) : 0
  if (!Number.isFinite(rawQuantity)) {
    console.warn(`[item ${rowLabel}] 수량 누락 → 0 처리`)
  }
  if (!Number.isFinite(rawUnitPrice)) {
    console.warn(`[item ${rowLabel}] 단가 누락 → 0 처리`)
  }

  // 금액(Notion `금액` formula) 은 읽지 않고 코드 계산(규칙 6).
  return { name, quantity, unitPrice, note, amount: quantity * unitPrice }
}

/**
 * 항목 + 부가세율 → 견적 합계({@link QuoteTotals}). 코드 계산(규칙 6, SSOT).
 *
 * - `subtotal = Σ items.amount`
 * - `tax = Math.round(subtotal * taxRate / 100)` (taxRate=0 → tax=0)
 * - `total = subtotal + tax`
 *
 * 세 값 모두 정수 원 단위(반올림). Notion 의 `금액`/`총금액` 컬럼은 사용하지 않는다.
 *
 * @param items 정규화된 항목 배열({@link getQuoteItems} 결과).
 * @param taxRate 부가세율(%). {@link Quote.taxRate}. 0 이면 부가세 0.
 */
export function calculateTotals(
  items: QuoteItem[],
  taxRate: number,
): QuoteTotals {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const tax = Math.round((subtotal * taxRate) / 100)
  const total = subtotal + tax
  return { subtotal, tax, total }
}

// ──────── Notion 속성 값 추출 헬퍼 (없거나 타입 불일치 시 null) ────────

type PropValue = PageObjectResponse["properties"][string]

/** title 타입 → 연결된 plain_text. 빈 문자열은 null. */
function getTitleText(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "title") return null
  const text = prop.title.map((t) => t.plain_text).join("")
  return text.length > 0 ? text : null
}

/** rich_text 타입 → 연결된 plain_text. 빈 문자열은 null. */
function getRichText(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "rich_text") return null
  const text = prop.rich_text.map((t) => t.plain_text).join("")
  return text.length > 0 ? text : null
}

/** formula(string) 타입 → 문자열 값. (슬러그 전용) */
function getFormulaString(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "formula") return null
  return prop.formula.type === "string" ? (prop.formula.string ?? null) : null
}

/** select 타입 → 선택 옵션명(한글 원본). */
function getSelect(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "select") return null
  return prop.select?.name ?? null
}

/** date 타입 → start(ISO 8601). */
function getDate(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "date") return null
  return prop.date?.start ?? null
}

/** number 타입 → 값. */
function getNumber(prop: PropValue | undefined): number | null {
  if (!prop || prop.type !== "number") return null
  return prop.number
}
