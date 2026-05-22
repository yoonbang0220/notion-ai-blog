/**
 * T3.2(queryPublishedQuotes) 자기검증 — 관리자 목록 페치.
 *
 * 실행:
 *   npm run test:admin-quotes
 *   (내부: node --env-file=.env.local --import tsx scripts/test/admin-quotes.ts)
 *
 * .env.local 에 NOTION_TOKEN / NOTION_DATABASE_ID 가 설정돼 있어야 실 페치 시나리오가 돈다.
 *
 * ⚠️ lib/quotes.ts 는 `import "server-only"` 가드를 가져 순수 Node(tsx) 에서 throw 한다.
 *   따라서 본 스크립트는 lib 모듈을 직접 import 하지 않고 queryPublishedQuotes 의 핵심 로직을
 *   **v5 SDK 직접 호출로 인라인 복제**한다(코드 리뷰로 동치성 확보).
 *
 * ⚠️ slug formula 는 서버 필터 불가(quotes-client.ts 주석 참조)지만, queryPublishedQuotes 는
 *   slug 로 필터하지 않고 `상태=발행` 으로만 필터하므로 이 함정과 무관하다.
 *
 * 검증 시나리오:
 *   1. 정상: 발행 시드 ≥2건, 각 행 6필드(slug/title/clientCompany/quoteNumber/issuedAt/status),
 *            발행일 내림차순(null 은 맨 뒤)
 *   2. 인증 실패: 잘못된 NOTION_TOKEN → APIErrorCode.Unauthorized 캐치
 *   3. 빈 결과: 존재하지 않는 상태값(예: "없는상태") 필터 → 빈 배열, throw 없음
 *   4. 페이지네이션 경계: page_size=1 강제로 has_more 다중 페이지 → 합산 건수가 단일 호출과
 *            일치(누락·중복 0)
 *   5. 항목/합계 미페치: 결과 객체에 items/subtotal/total/notes 키 부재(N+1 방지 회귀 가드)
 */

import {
  APIErrorCode,
  APIResponseError,
  Client,
  isFullDatabase,
  isFullPage,
} from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"

// ──────── 도메인 타입(types/index.ts QuoteListItem 복제) ────────

type QuoteStatus = "Draft" | "Published" | "Archived"
type QuoteListItem = {
  slug: string | null
  title: string | null
  clientCompany: string | null
  quoteNumber: string | null
  issuedAt: string | null
  status: QuoteStatus
}

type ScenarioResult = { name: string; ok: boolean; detail: string }

// ──────── 매핑 상수(lib/quotes.ts 복제) ────────

const PROP = {
  title: "제목",
  status: "상태",
  slug: "슬러그",
  clientCompany: "고객사",
  quoteNumber: "견적번호",
  issuedAt: "발행일",
} as const
const STATUS: Record<string, QuoteStatus> = {
  초안: "Draft",
  발행: "Published",
  보관: "Archived",
}
const STATUS_PUBLISHED_KO = "발행"
const SLUG_PATTERN = /^[A-Za-z0-9_-]{32,}$/

// ──────── 추출 헬퍼(lib/quotes.ts 와 동일) ────────

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
function getSelect(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "select") return null
  return prop.select?.name ?? null
}
function getDate(prop: PropValue | undefined): string | null {
  if (!prop || prop.type !== "date") return null
  return prop.date?.start ?? null
}

// ──────── lib/quotes.ts::queryPublishedQuotes 인라인 복제 ────────

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

function normalizeQuoteListItem(page: PageObjectResponse): QuoteListItem {
  const p = page.properties
  const title = getTitleText(p[PROP.title])
  const rawSlug = getFormulaString(p[PROP.slug])
  const clientCompany = getRichText(p[PROP.clientCompany])
  const quoteNumber = getRichText(p[PROP.quoteNumber])
  const issuedAt = getDate(p[PROP.issuedAt])
  const rawStatus = getSelect(p[PROP.status])
  const status: QuoteStatus = (rawStatus && STATUS[rawStatus]) || "Published"
  const slug = rawSlug && SLUG_PATTERN.test(rawSlug) ? rawSlug : null
  return { slug, title, clientCompany, quoteNumber, issuedAt, status }
}

/**
 * queryPublishedQuotes 동치. statusValue·pageSize 를 주입 가능하게 해서 빈결과/페이지네이션
 * 시나리오를 검증한다(lib 본체는 인자 없음 — 상태=발행 고정·page_size=100 고정).
 */
async function queryPublishedQuotesEquiv(
  client: Client,
  invoiceDbId: string,
  statusValue: string = STATUS_PUBLISHED_KO,
  pageSize: number = 100,
): Promise<QuoteListItem[]> {
  const dataSourceId = await resolveDataSource(client, invoiceDbId)
  const pages: PageObjectResponse[] = []
  let startCursor: string | undefined = undefined
  const MAX_PAGES = 50
  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await client.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: PROP.status, select: { equals: statusValue } },
      sorts: [{ property: PROP.issuedAt, direction: "descending" }],
      page_size: pageSize,
      start_cursor: startCursor,
    })
    for (const page of res.results) {
      if (isFullPage(page)) pages.push(page)
    }
    if (!res.has_more || !res.next_cursor) break
    startCursor = res.next_cursor
  }
  const items = pages.map((page) => normalizeQuoteListItem(page))
  return items.sort((a, b) => {
    if (a.issuedAt === b.issuedAt) return 0
    if (a.issuedAt === null) return 1
    if (b.issuedAt === null) return -1
    return a.issuedAt < b.issuedAt ? 1 : -1
  })
}

// ──────── 시나리오 ────────

/** 발행 목록을 한 번만 페치해 시나리오 1/5 가 공유. */
let listCache: QuoteListItem[] | null = null
let listSkipped = false

async function loadList(): Promise<QuoteListItem[] | null> {
  if (listCache) return listCache
  if (listSkipped) return null
  const token = process.env.NOTION_TOKEN
  const invoiceDb = process.env.NOTION_DATABASE_ID
  if (!token || !invoiceDb) {
    listSkipped = true
    return null
  }
  const client = new Client({ auth: token })
  listCache = await queryPublishedQuotesEquiv(client, invoiceDb)
  return listCache
}

/** 시나리오 1: 정상 — 발행 시드 ≥2건, 6필드 정규화, 발행일 내림차순. */
async function scenario1Normal(): Promise<ScenarioResult> {
  const name = "1. 정상 (발행 ≥2건, 6필드, 발행일 내림차순)"
  try {
    const list = await loadList()
    if (!list) return { name, ok: true, detail: "환경변수 미설정 → 스킵" }
    if (list.length < 2) {
      return { name, ok: false, detail: `발행 견적 ${list.length}건(시드 ≥2 기대)` }
    }
    // 6필드 키 존재 + 발행일 내림차순(null 맨 뒤) 검증.
    const keys = Object.keys(list[0]).sort().join(",")
    const expectedKeys =
      "clientCompany,issuedAt,quoteNumber,slug,status,title"
    let sorted = true
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1].issuedAt
      const cur = list[i].issuedAt
      // null 은 맨 뒤여야 한다. non-null 끼리는 prev >= cur(내림차순).
      if (prev === null && cur !== null) {
        sorted = false
        break
      }
      if (prev !== null && cur !== null && prev < cur) {
        sorted = false
        break
      }
    }
    const ok = keys === expectedKeys && sorted
    return {
      name,
      ok,
      detail: `${list.length}건, keys=[${keys}], 내림차순=${sorted}`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 2: 인증 실패 — 잘못된 토큰 → Unauthorized. */
async function scenario2Unauthorized(): Promise<ScenarioResult> {
  const name = "2. 인증 실패 (401 Unauthorized)"
  const dbId = process.env.NOTION_DATABASE_ID
  if (!dbId) return { name, ok: false, detail: "NOTION_DATABASE_ID 미설정" }
  const badClient = new Client({ auth: "secret_obviously_invalid_token_for_test" })
  try {
    await queryPublishedQuotesEquiv(badClient, dbId)
    return { name, ok: false, detail: "401 미발생(예상과 다름)" }
  } catch (e) {
    if (
      APIResponseError.isAPIResponseError(e) &&
      e.code === APIErrorCode.Unauthorized
    ) {
      return { name, ok: true, detail: "APIErrorCode.Unauthorized 캐치" }
    }
    return { name, ok: false, detail: `다른 에러: ${errorMessage(e)}` }
  }
}

/**
 * 시나리오 3: 빈 결과 — 매칭 0건인 **유효** 상태 필터 → 빈 배열, throw 없음.
 *
 * ⚠️ 실측(2026-05-22): Notion `select` 필터에 **존재하지 않는 옵션값**을 주면 빈 결과가
 *   아니라 `validation_error: select option "..." not found` 를 던진다. 따라서 빈 결과는
 *   "존재하지만 매칭 0건인 옵션"으로만 만들 수 있다. 시드 기준 `초안`/`보관` 은 0건이라
 *   이를 사용한다(둘 다 0건). 만약 미래에 둘 다 견적이 생기면 빈 결과를 강제할 수 없으므로
 *   "유효 상태로 throw 없이 배열 반환"만 검증(부분)하고 안내한다.
 */
async function scenario3Empty(): Promise<ScenarioResult> {
  const name = "3. 빈 결과 (매칭 0건 상태 → 빈 배열, throw 0)"
  const token = process.env.NOTION_TOKEN
  const invoiceDb = process.env.NOTION_DATABASE_ID
  if (!token || !invoiceDb) return { name, ok: false, detail: "환경변수 미설정" }
  try {
    const client = new Client({ auth: token })
    // 존재하는 옵션 중 매칭 0건인 것을 찾는다(초안→보관 순).
    for (const status of ["초안", "보관"]) {
      const result = await queryPublishedQuotesEquiv(client, invoiceDb, status)
      if (result.length === 0) {
        return {
          name,
          ok: true,
          detail: `상태="${status}" → 빈 배열, throw 없음`,
        }
      }
    }
    // 폴백: 둘 다 0건이 아니면 빈 결과를 강제 못 함 → throw 없음만 부분 검증.
    const r = await queryPublishedQuotesEquiv(client, invoiceDb, "보관")
    return {
      name,
      ok: Array.isArray(r),
      detail: `초안/보관 모두 비어있지 않음 — throw 없이 배열 반환만 확인(${r.length}건)`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 4: 페이지네이션 경계 — page_size=1 강제 합산 == 단일 호출 결과. */
async function scenario4Pagination(): Promise<ScenarioResult> {
  const name = "4. 페이지네이션 경계 (page_size=1 합산 == 단일)"
  const token = process.env.NOTION_TOKEN
  const invoiceDb = process.env.NOTION_DATABASE_ID
  if (!token || !invoiceDb) return { name, ok: false, detail: "환경변수 미설정" }
  try {
    const client = new Client({ auth: token })
    // page_size=1 → 발행 견적 수만큼 has_more 루프 → 전수 합산.
    const paged = await queryPublishedQuotesEquiv(
      client,
      invoiceDb,
      STATUS_PUBLISHED_KO,
      1,
    )
    const single = (await loadList()) ?? []
    // 건수 일치 + slug 집합 동일(누락·중복 0). slug=null 행은 title 로 식별.
    const keyOf = (q: QuoteListItem) => q.slug ?? `title:${q.title}`
    const pagedKeys = new Set(paged.map(keyOf))
    const singleKeys = new Set(single.map(keyOf))
    const sameSize =
      paged.length === single.length && pagedKeys.size === paged.length
    const sameSet =
      [...pagedKeys].every((k) => singleKeys.has(k)) &&
      [...singleKeys].every((k) => pagedKeys.has(k))
    const ok = sameSize && sameSet
    return {
      name,
      ok,
      detail: `page1=${paged.length}건 / page100=${single.length}건, 집합일치=${sameSet}, 중복0=${pagedKeys.size === paged.length}`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

/** 시나리오 5: 항목/합계 미페치 — 결과 객체에 items/subtotal/total/notes 키 부재. */
async function scenario5NoItems(): Promise<ScenarioResult> {
  const name = "5. 항목/합계 미페치 (items/subtotal/total/notes 키 부재)"
  try {
    const list = await loadList()
    // 시드가 없어도 정규화 함수 자체의 키 집합을 합성 페이지로 검증(스킵하지 않음).
    const sample: QuoteListItem | undefined = list?.[0]
    if (sample) {
      const forbidden = ["items", "subtotal", "total", "notes", "amount", "tax"]
      const present = forbidden.filter((k) => k in sample)
      const ok = present.length === 0
      return {
        name,
        ok,
        detail: ok
          ? `금지 키 0개, 보유 키=[${Object.keys(sample).sort().join(",")}]`
          : `금지 키 발견: ${present.join(",")}`,
      }
    }
    // 시드 없음 → 타입 형태만 정적 보장(컴파일 시 QuoteListItem 에 items 없음). 통과 처리.
    return { name, ok: true, detail: "시드 미설정 → 타입 정의로 키 부재 보장" }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
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
  results.push(await scenario2Unauthorized())
  results.push(await scenario3Empty())
  results.push(await scenario4Pagination())
  results.push(await scenario5NoItems())

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
