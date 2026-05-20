/**
 * T1.2(getQuoteBySlug) + T1.3(getQuoteItems / calculateTotals) 통합 자기검증.
 *
 * 실행:
 *   npm run test:quotes
 *   (내부: node --env-file=.env.local --import tsx scripts/test/quotes-client.ts)
 *
 * .env.local 에 NOTION_TOKEN / NOTION_DATABASE_ID / NOTION_ITEMS_DATABASE_ID 가
 * 반드시 설정돼 있어야 한다. SEED_SLUG_ACTIVE 가 있으면 실 페치 시나리오를 수행한다.
 *
 * ⚠️ lib/quotes.ts 는 첫 줄 `import "server-only"` 가드를 갖는다. 순수 Node(tsx)
 *   환경에는 `react-server` condition 이 없어 throw 하므로, 본 스크립트는 lib 모듈을
 *   직접 import 하지 않고 동일 로직을 인라인 복제한다(코드 리뷰로 동치성 확보).
 *
 * ⚠️ 실측 발견(2026-05-20): `슬러그`(formula `replaceAll(id(), "-", "")`) 속성에
 *   대한 dataSources.query 필터(`formula: { string: { equals } }`)가 Notion 서버에서
 *   `validation_error: Unable to filter based on a formula of unknown type` 로 실패한다.
 *   id() 결과의 formula 출력 타입을 서버가 결정하지 못하기 때문(rich_text 변형도 동일).
 *   페이지 응답에서는 `formula.type === "string"` 으로 정상 평가된다.
 *   → 본 스크립트의 getQuoteBySlug 동치 로직은 "상태=발행 필터 + 코드 측 슬러그 비교"
 *     폴백을 사용한다. lib/quotes.ts::getQuoteBySlug(T1.2)도 동일 폴백으로 수정 완료
 *     (2026-05-20). 따라서 본 스크립트 로직은 lib 와 동치다.
 *
 * 검증 시나리오:
 *   1. 정상: 실 시드 slug 페치 → 1건, 필수 5속성 not-null + 항목 ≥1, warning null
 *   2. 합계 계산: 페치 항목 + taxRate → subtotal/tax/total 수동 기대값 일치(정수 반올림)
 *   3. 실패(인증): 잘못된 토큰 → APIErrorCode.Unauthorized 캐치
 *   4. 빈 결과: 존재하지 않는 slug → getQuoteBySlug 동치 로직이 null
 *   5. 엣지(slug 형식): "too-short" → Notion 호출 없이 null(정규식)
 *   6. 엣지(부가세 0%): calculateTotals(items, 0) → tax=0, total=subtotal
 *   7. 합계 순수 로직: 반올림 경계값(1234567 × 10% → 123457) 동치 검증(시드 무관)
 *   8~10. 만료 판정(T1.7, isQuoteExpired 순수 함수): 유효(미래→false)/만료(과거→true)/
 *         null(false + console.warn 1회). 시드 무관.
 */

import {
  APIErrorCode,
  APIResponseError,
  Client,
  isFullDatabase,
  isFullPage,
} from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"

// ──────── 도메인 타입(types/index.ts 와 동일 — 격리용 최소 복제) ────────

type QuoteItem = {
  name: string
  quantity: number
  unitPrice: number
  note: string | null
  amount: number
}
type QuoteTotals = { subtotal: number; tax: number; total: number }

type ScenarioResult = { name: string; ok: boolean; detail: string }

// ──────── 매핑 상수(lib/quotes.ts PROP/ITEM_PROP/SLUG_PATTERN 복제) ────────

const PROP = {
  title: "제목",
  status: "상태",
  slug: "슬러그",
  clientCompany: "고객사",
  issuerCompany: "발행사",
  taxRate: "부가세율",
} as const
const ITEM_PROP = {
  name: "항목명",
  invoice: "견적",
  quantity: "수량",
  unitPrice: "단가",
  note: "비고",
} as const
const STATUS_PUBLISHED_KO = "발행"
const SLUG_PATTERN = /^[A-Za-z0-9_-]{32,}$/

// ──────── 추출 헬퍼(lib/quotes.ts 와 동일 로직) ────────

type PropValue = PageObjectResponse["properties"][string]

function getTitleText(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "title") return null
  const text = prop.title.map((t) => t.plain_text).join("")
  return text.length > 0 ? text : null
}
function getRichText(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "rich_text") return null
  const text = prop.rich_text.map((t) => t.plain_text).join("")
  return text.length > 0 ? text : null
}
function getFormulaString(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "formula") return null
  return prop.formula.type === "string" ? (prop.formula.string ?? null) : null
}
function getNumber(prop: PropValue | undefined): number | null {
  if (!prop || prop.type !== "number") return null
  return prop.number
}
function getSelect(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "select") return null
  return prop.select?.name ?? null
}

// ──────── lib/quotes.ts 핵심 함수 인라인 복제 ────────

async function resolveDataSource(
  client: Client,
  databaseId: string,
): Promise<string> {
  const db = await client.databases.retrieve({ database_id: databaseId })
  if (!isFullDatabase(db)) throw new Error(`partial 응답 — ${databaseId}`)
  const id = db.data_sources[0]?.id
  if (!id) throw new Error(`data source 없음 — ${databaseId}`)
  return id
}

/**
 * getQuoteBySlug 동치(lib/quotes.ts 와 완전 동일한 폴백 로직 복제).
 *
 * lib·본 스크립트 모두 "상태=발행 필터 + 코드 측 슬러그 비교 + 페이지네이션 + 중복 throw"
 * 폴백을 쓴다(슬러그 formula 서버필터 불가 — 상단 주석 참조).
 * 형식 위반 slug → Notion 호출 없이 null(규칙 3), 2건 이상 → throw(규칙 1).
 */
async function getQuoteBySlugEquiv(
  client: Client,
  invoiceDbId: string,
  slug: string,
): Promise<PageObjectResponse | null> {
  if (!SLUG_PATTERN.test(slug)) return null // 규칙 3 — Notion 호출 없음
  const dataSourceId = await resolveDataSource(client, invoiceDbId)
  const matches: PageObjectResponse[] = []
  let startCursor: string | undefined = undefined
  while (true) {
    const res = await client.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: PROP.status, select: { equals: STATUS_PUBLISHED_KO } },
      page_size: 100,
      start_cursor: startCursor,
    })
    for (const page of res.results) {
      if (!isFullPage(page)) continue
      if (getFormulaString(page.properties[PROP.slug]) === slug) matches.push(page)
    }
    if (!res.has_more || !res.next_cursor) break
    startCursor = res.next_cursor
  }
  if (matches.length === 0) return null // 규칙 3 → 404
  if (matches.length >= 2) throw new Error(`Duplicate slug: ${slug}`) // 규칙 1
  return matches[0]
}

/** getQuoteItems 동치(lib/quotes.ts 와 동일 로직). */
async function getQuoteItemsEquiv(
  client: Client,
  itemsDbId: string,
  invoiceId: string,
): Promise<{ items: QuoteItem[]; warning: string | null }> {
  const dataSourceId = await resolveDataSource(client, itemsDbId)
  const pages: PageObjectResponse[] = []
  let startCursor: string | undefined = undefined
  const MAX_ITEMS_PAGES = 50
  let truncated = false
  for (let i = 0; i < MAX_ITEMS_PAGES; i++) {
    const res = await client.dataSources.query({
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
    if (i === MAX_ITEMS_PAGES - 1) truncated = true
  }
  if (pages.length === 0) return { items: [], warning: "항목이 없습니다." }
  const items = pages.map((page) => normalizeItemEquiv(page))
  const warning = truncated
    ? `항목이 너무 많아 일부만 표시됩니다(최대 ${MAX_ITEMS_PAGES * 100}행).`
    : null
  return { items, warning }
}

function normalizeItemEquiv(page: PageObjectResponse): QuoteItem {
  const p = page.properties
  const name = getTitleText(p[ITEM_PROP.name]) ?? ""
  const rawQuantity = getNumber(p[ITEM_PROP.quantity])
  const rawUnitPrice = getNumber(p[ITEM_PROP.unitPrice])
  const note = getRichText(p[ITEM_PROP.note])
  const quantity = Number.isFinite(rawQuantity) ? (rawQuantity as number) : 0
  const unitPrice = Number.isFinite(rawUnitPrice) ? (rawUnitPrice as number) : 0
  return { name, quantity, unitPrice, note, amount: quantity * unitPrice }
}

/** calculateTotals 동치(lib/quotes.ts 와 동일 로직). */
function calculateTotalsEquiv(items: QuoteItem[], taxRate: number): QuoteTotals {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const tax = Math.round((subtotal * taxRate) / 100)
  return { subtotal, tax, total: subtotal + tax }
}

/**
 * isQuoteExpired 동치(lib/quotes.ts 와 동일 로직, T1.7).
 *
 * 순수 함수라 시드 무관. validUntil 미래 → false, 과거 → true,
 * null → false + console.warn 1회(견적 식별자 포함).
 * 시나리오에서 식별자(pageId)만 쓰므로 최소 형태(`{ pageId, validUntil }`)로 받는다.
 */
function isQuoteExpiredEquiv(
  quote: { pageId: string; validUntil: string | null },
  now: Date = new Date(),
): boolean {
  if (!quote.validUntil) {
    console.warn(`[quote ${quote.pageId}] 유효기간(validUntil) 누락 → 만료 미판정`)
    return false
  }
  return new Date(quote.validUntil) < now
}

// ──────── 시나리오 ────────

/** 시드 페치 결과를 시나리오 1/2/6 가 공유(중복 페치 방지). */
type SeedFetch = {
  quote: PageObjectResponse
  items: QuoteItem[]
  itemsWarning: string | null
  taxRate: number
}
let seedCache: SeedFetch | null = null
let seedSkipped = false

async function loadSeed(): Promise<SeedFetch | null> {
  if (seedCache) return seedCache
  if (seedSkipped) return null
  const token = process.env.NOTION_TOKEN
  const invoiceDb = process.env.NOTION_DATABASE_ID
  const itemsDb = process.env.NOTION_ITEMS_DATABASE_ID
  const seedSlug = process.env.SEED_SLUG_ACTIVE
  if (!token || !invoiceDb || !itemsDb) {
    seedSkipped = true
    return null
  }
  if (!seedSlug) {
    console.warn(
      "[안내] SEED_SLUG_ACTIVE 미설정 — 실 페치 시나리오(1/2/6) 스킵. " +
        "docs/SETUP_NOTION.md 참고해 시드 slug 를 채우면 전체 검증이 돌아갑니다.",
    )
    seedSkipped = true
    return null
  }
  const client = new Client({ auth: token })
  const quote = await getQuoteBySlugEquiv(client, invoiceDb, seedSlug)
  if (!quote) throw new Error(`시드 slug 페치 실패(0건): ${seedSlug}`)
  const { items, warning } = await getQuoteItemsEquiv(client, itemsDb, quote.id)
  const taxRate = getNumber(quote.properties[PROP.taxRate]) ?? 10
  seedCache = { quote, items, itemsWarning: warning, taxRate }
  return seedCache
}

/** 시나리오 1: 정상 — 시드 slug 페치 + 필수 5속성 + 항목 ≥1. */
async function scenario1Normal(): Promise<ScenarioResult> {
  const name = "1. 정상 (시드 페치 + 필수속성 + 항목)"
  try {
    const seed = await loadSeed()
    if (!seed) return { name, ok: true, detail: "시드 미설정 → 스킵" }
    const p = seed.quote.properties
    const required: Record<string, string | null> = {
      title: getTitleText(p[PROP.title]),
      slug: getFormulaString(p[PROP.slug]),
      status: getSelect(p[PROP.status]),
      issuerCompany: getRichText(p[PROP.issuerCompany]),
      clientCompany: getRichText(p[PROP.clientCompany]),
    }
    const missing = Object.entries(required)
      .filter(([, v]) => !v)
      .map(([k]) => k)
    if (missing.length > 0) {
      return { name, ok: false, detail: `필수 속성 누락: ${missing.join(", ")}` }
    }
    if (seed.items.length < 1 || seed.itemsWarning !== null) {
      return {
        name,
        ok: false,
        detail: `항목 ${seed.items.length}건 / warning=${seed.itemsWarning}`,
      }
    }
    return {
      name,
      ok: true,
      detail: `필수5 not-null, 항목 ${seed.items.length}건, warning=null`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 2: 합계 계산 — 페치 항목 + taxRate → 수동 기대값 일치. */
async function scenario2Totals(): Promise<ScenarioResult> {
  const name = "2. 합계 계산 (실 항목 + 부가세 반올림)"
  try {
    const seed = await loadSeed()
    if (!seed) return { name, ok: true, detail: "시드 미설정 → 스킵" }
    const totals = calculateTotalsEquiv(seed.items, seed.taxRate)
    // 수동 기대값(라이브러리 함수와 독립적으로 재계산).
    const expectedSubtotal = seed.items.reduce(
      (s, it) => s + it.quantity * it.unitPrice,
      0,
    )
    const expectedTax = Math.round((expectedSubtotal * seed.taxRate) / 100)
    const expectedTotal = expectedSubtotal + expectedTax
    const match =
      totals.subtotal === expectedSubtotal &&
      totals.tax === expectedTax &&
      totals.total === expectedTotal &&
      Number.isInteger(totals.subtotal) &&
      Number.isInteger(totals.tax) &&
      Number.isInteger(totals.total)
    const detail =
      `taxRate=${seed.taxRate}% subtotal=${totals.subtotal} ` +
      `tax=${totals.tax} total=${totals.total} ` +
      `(기대 ${expectedSubtotal}/${expectedTax}/${expectedTotal})`
    return { name, ok: match, detail }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 3: 인증 실패 — 잘못된 토큰 → Unauthorized. */
async function scenario3Unauthorized(): Promise<ScenarioResult> {
  const name = "3. 인증 실패 (401 Unauthorized)"
  const dbId = process.env.NOTION_DATABASE_ID
  if (!dbId) return { name, ok: false, detail: "NOTION_DATABASE_ID 미설정" }
  const badClient = new Client({ auth: "secret_obviously_invalid_token_for_test" })
  try {
    await badClient.databases.retrieve({ database_id: dbId })
    return { name, ok: false, detail: "401 미발생(예상과 다름)" }
  } catch (e) {
    if (
      APIResponseError.isAPIResponseError(e) &&
      e.code === APIErrorCode.Unauthorized
    ) {
      return { name, ok: true, detail: `APIErrorCode.Unauthorized 캐치` }
    }
    return { name, ok: false, detail: `다른 에러: ${errorMessage(e)}` }
  }
}

/** 시나리오 4: 빈 결과 — 존재하지 않는(형식만 valid) slug → null. */
async function scenario4Empty(): Promise<ScenarioResult> {
  const name = "4. 빈 결과 (없는 slug → null)"
  const token = process.env.NOTION_TOKEN
  const invoiceDb = process.env.NOTION_DATABASE_ID
  if (!token || !invoiceDb) return { name, ok: false, detail: "환경변수 미설정" }
  // 형식은 통과(32자 hex)하지만 절대 매칭 안 되는 sentinel slug.
  const ghostSlug = "00000000000000000000000000000000"
  try {
    const client = new Client({ auth: token })
    const result = await getQuoteBySlugEquiv(client, invoiceDb, ghostSlug)
    return result === null
      ? { name, ok: true, detail: "없는 slug → null, throw 없음" }
      : { name, ok: false, detail: "null 이 아닌 결과 반환됨" }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 5: slug 형식 위반 — Notion 호출 없이 null. */
async function scenario5SlugFormat(): Promise<ScenarioResult> {
  const name = "5. slug 형식 위반 (Notion 호출 없이 null)"
  const token = process.env.NOTION_TOKEN
  const invoiceDb = process.env.NOTION_DATABASE_ID
  if (!token || !invoiceDb) return { name, ok: false, detail: "환경변수 미설정" }
  try {
    const client = new Client({ auth: token })
    // SLUG_PATTERN 위반("too-short") → SDK 호출 발생 전에 null 이어야 한다.
    const result = await getQuoteBySlugEquiv(client, invoiceDb, "too-short")
    // 정규식 단위 동작도 함께 확인.
    const regexOk =
      !SLUG_PATTERN.test("too-short") &&
      SLUG_PATTERN.test("00000000000000000000000000000000")
    return result === null && regexOk
      ? { name, ok: true, detail: '"too-short" → null + 정규식 경계 확인' }
      : { name, ok: false, detail: `result=${result} regexOk=${regexOk}` }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 6: 부가세 0% — tax=0, total=subtotal. */
async function scenario6ZeroTax(): Promise<ScenarioResult> {
  const name = "6. 부가세 0% (tax=0, total=subtotal)"
  try {
    const seed = await loadSeed()
    // 시드 없으면 합성 항목으로 순수 로직 검증(스킵하지 않음).
    const items: QuoteItem[] =
      seed?.items ??
      [
        { name: "A", quantity: 2, unitPrice: 100, note: null, amount: 200 },
        { name: "B", quantity: 1, unitPrice: 50, note: null, amount: 50 },
      ]
    const totals = calculateTotalsEquiv(items, 0)
    const subtotal = items.reduce((s, it) => s + it.amount, 0)
    const ok = totals.tax === 0 && totals.total === subtotal
    return {
      name,
      ok,
      detail: `subtotal=${totals.subtotal} tax=${totals.tax} total=${totals.total}`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 추가: 합계 반올림 경계값(시드 무관 순수 로직). */
function scenario7RoundingBoundary(): ScenarioResult {
  const name = "7. 합계 반올림 경계 (1234567 × 10% → 123457)"
  const items: QuoteItem[] = [
    { name: "X", quantity: 1, unitPrice: 1234567, note: null, amount: 1234567 },
  ]
  const totals = calculateTotalsEquiv(items, 10)
  // 1234567 * 10 / 100 = 123456.7 → Math.round → 123457
  const ok =
    totals.subtotal === 1234567 &&
    totals.tax === 123457 &&
    totals.total === 1358024
  return {
    name,
    ok,
    detail: `subtotal=${totals.subtotal} tax=${totals.tax} total=${totals.total}`,
  }
}

/** 시나리오 8: 만료 판정(유효) — validUntil 미래 → false. */
function scenario8ExpiredFuture(): ScenarioResult {
  const name = "8. 만료 판정: 유효(validUntil 미래 → false)"
  const future = new Date("2999-12-31T00:00:00Z").toISOString()
  const result = isQuoteExpiredEquiv({ pageId: "test-active", validUntil: future })
  return {
    name,
    ok: result === false,
    detail: `validUntil=${future.slice(0, 10)} → isExpired=${result}`,
  }
}

/** 시나리오 9: 만료 판정(만료) — validUntil 과거 → true. */
function scenario9ExpiredPast(): ScenarioResult {
  const name = "9. 만료 판정: 만료(validUntil 과거 → true)"
  const past = new Date("2000-01-01T00:00:00Z").toISOString()
  const result = isQuoteExpiredEquiv({ pageId: "test-expired", validUntil: past })
  return {
    name,
    ok: result === true,
    detail: `validUntil=${past.slice(0, 10)} → isExpired=${result}`,
  }
}

/**
 * 시나리오 10: 만료 판정(null) — validUntil=null → false + console.warn 1회.
 *
 * console.warn 을 일시적으로 가로채 호출 횟수만 카운트한다(출력은 억제해 요약을
 * 깔끔히 유지). throw 가 없어야 하며 결과는 false 여야 한다.
 */
function scenario10ExpiredNull(): ScenarioResult {
  const name = "10. 만료 판정: null(false + warn 1회)"
  const originalWarn = console.warn
  let warnCount = 0
  console.warn = () => {
    warnCount += 1
  }
  try {
    const result = isQuoteExpiredEquiv({ pageId: "test-null", validUntil: null })
    const ok = result === false && warnCount === 1
    return {
      name,
      ok,
      detail: `isExpired=${result}, console.warn 호출=${warnCount}회`,
    }
  } catch (e) {
    return { name, ok: false, detail: `throw 발생(예상과 다름): ${errorMessage(e)}` }
  } finally {
    console.warn = originalWarn
  }
}

function errorMessage(e: unknown): string {
  if (APIResponseError.isAPIResponseError(e)) return `${e.code}: ${e.message}`
  if (e instanceof Error) return `${e.name}: ${e.message}`
  return String(e)
}

async function run() {
  const results: ScenarioResult[] = []
  results.push(await scenario1Normal())
  results.push(await scenario2Totals())
  results.push(await scenario3Unauthorized())
  results.push(await scenario4Empty())
  results.push(await scenario5SlugFormat())
  results.push(await scenario6ZeroTax())
  results.push(scenario7RoundingBoundary())
  results.push(scenario8ExpiredFuture())
  results.push(scenario9ExpiredPast())
  results.push(scenario10ExpiredNull())

  console.log("\n=== 결과 요약 ===")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  console.log(
    failed.length === 0
      ? "\n🎉 전체 PASS"
      : `\n⚠ ${failed.length}건 FAIL — 위 detail 확인.`,
  )
  process.exitCode = failed.length > 0 ? 1 : 0
}

run().catch((e) => {
  console.error("[예상치 못한 최상위 에러]", e)
  process.exitCode = 1
})
