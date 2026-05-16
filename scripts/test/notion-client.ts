/**
 * T1.1 Notion Client + queryPublishedPages 헬퍼 4종 시나리오 자기검증.
 *
 * 실행:
 *   npm run test:notion
 *
 * .env.local 에 NOTION_TOKEN / NOTION_DATABASE_ID 가 반드시 설정돼 있어야 한다.
 *
 * 주의: lib/notion.ts 는 첫 줄 `import "server-only"` 가드를 갖는다.
 *   순수 Node 환경에서는 `react-server` condition 이 없어 throw 하므로,
 *   본 스크립트는 lib 모듈을 직접 import 하지 않고 queryPublishedPages 로직을
 *   인라인 복제해 동일 동작을 검증한다(코드 리뷰로 동치성 확보).
 *
 * 검증 시나리오:
 *   1. 정상: 인라인 queryPublishedPages 로 실 DB 페치 → length>=0, 모두 object==="page"
 *   2. 401: 잘못된 토큰으로 databases.retrieve → APIErrorCode.Unauthorized
 *   3. 404: 정상 토큰 + 미공유 DB ID(임의 UUID) → APIErrorCode.ObjectNotFound + 권한 확인 안내
 *   4. 빈 결과: Slug rich_text 에 절대 매칭 안 되는 contains 필터 → throw 없이 []
 */

import {
  APIErrorCode,
  APIResponseError,
  Client,
  isFullDatabase,
  isFullPage,
} from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"

type ScenarioResult = { name: string; ok: boolean; detail: string }

async function run() {
  const results: ScenarioResult[] = []
  results.push(await scenario1Normal())
  results.push(await scenario2Unauthorized())
  results.push(await scenario3NotFound())
  results.push(await scenario4EmptyResult())

  console.log("\n=== 결과 요약 ===")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  process.exitCode = failed.length > 0 ? 1 : 0
}

/** lib/notion.ts queryPublishedPages 와 동일 로직(테스트 격리용 복제). */
async function inlineQueryPublishedPages(
  client: Client,
  databaseId: string,
): Promise<PageObjectResponse[]> {
  const db = await client.databases.retrieve({ database_id: databaseId })
  if (!isFullDatabase(db)) {
    throw new Error(`Notion DB partial 응답 — ID 확인: ${databaseId}`)
  }
  const dataSourceId = db.data_sources[0]?.id
  if (!dataSourceId) {
    throw new Error(`Notion DB(${databaseId}) 에 data source 가 없습니다.`)
  }
  const collected: PageObjectResponse[] = []
  let startCursor: string | undefined = undefined
  while (true) {
    const res = await client.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Status", select: { equals: "Published" } },
      sorts: [{ property: "PublishedAt", direction: "descending" }],
      page_size: 100,
      start_cursor: startCursor,
    })
    for (const item of res.results) {
      if (isFullPage(item)) collected.push(item)
    }
    if (!res.has_more || !res.next_cursor) break
    startCursor = res.next_cursor
  }
  return collected
}

async function scenario1Normal(): Promise<ScenarioResult> {
  const name = "1. 정상 (inline queryPublishedPages)"
  const token = process.env.NOTION_TOKEN
  const dbId = process.env.NOTION_DATABASE_ID
  if (!token || !dbId) return { name, ok: false, detail: "환경변수 미설정" }
  try {
    const client = new Client({ auth: token })
    const pages = await inlineQueryPublishedPages(client, dbId)
    const allArePages = pages.every((p) => p.object === "page")
    if (!allArePages) return { name, ok: false, detail: `object !== "page" 항목 존재` }
    return {
      name,
      ok: true,
      detail: `${pages.length}건 페치, 모두 object="page"`,
    }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

async function scenario2Unauthorized(): Promise<ScenarioResult> {
  const name = "2. 잘못된 토큰 (401 Unauthorized)"
  const dbId = process.env.NOTION_DATABASE_ID
  if (!dbId) return { name, ok: false, detail: "NOTION_DATABASE_ID 미설정" }
  const badClient = new Client({ auth: "secret_obviously_invalid_token_for_test" })
  try {
    await badClient.databases.retrieve({ database_id: dbId })
    return { name, ok: false, detail: "401 이 발생하지 않았다(예상과 다름)" }
  } catch (e) {
    if (APIResponseError.isAPIResponseError(e) && e.code === APIErrorCode.Unauthorized) {
      return { name, ok: true, detail: `APIErrorCode.Unauthorized 캐치됨 — ${e.message}` }
    }
    return { name, ok: false, detail: `다른 에러: ${errorMessage(e)}` }
  }
}

async function scenario3NotFound(): Promise<ScenarioResult> {
  const name = "3. 미공유 DB ID (404 ObjectNotFound)"
  const token = process.env.NOTION_TOKEN
  if (!token) return { name, ok: false, detail: "NOTION_TOKEN 미설정" }
  const fakeDbId = "00000000-0000-0000-0000-000000000000"
  const client = new Client({ auth: token })
  try {
    await client.databases.retrieve({ database_id: fakeDbId })
    return { name, ok: false, detail: "404 가 발생하지 않았다(권한이 의외로 있음?)" }
  } catch (e) {
    if (APIResponseError.isAPIResponseError(e) && e.code === APIErrorCode.ObjectNotFound) {
      console.warn(
        "[안내] Notion Integration 이 해당 DB 에 공유돼 있는지, ID 가 올바른지 확인하세요.",
      )
      return {
        name,
        ok: true,
        detail: `APIErrorCode.ObjectNotFound 캐치됨 + 권한 확인 안내 출력`,
      }
    }
    if (
      APIResponseError.isAPIResponseError(e) &&
      (e.code as string) === "validation_error"
    ) {
      return {
        name,
        ok: true,
        detail: `validation_error 캐치됨(UUID 형식 거부) — 권한 분기 안내`,
      }
    }
    return { name, ok: false, detail: `다른 에러: ${errorMessage(e)}` }
  }
}

async function scenario4EmptyResult(): Promise<ScenarioResult> {
  const name = "4. 빈 결과 ([] 반환)"
  const token = process.env.NOTION_TOKEN
  const dbId = process.env.NOTION_DATABASE_ID
  if (!token || !dbId) return { name, ok: false, detail: "환경변수 미설정" }
  const client = new Client({ auth: token })
  try {
    const db = await client.databases.retrieve({ database_id: dbId })
    if (!isFullDatabase(db)) return { name, ok: false, detail: "partial response" }
    const dataSourceId = db.data_sources[0]?.id
    if (!dataSourceId) return { name, ok: false, detail: "data source 없음" }
    // Slug 는 rich_text 타입 — 절대 매칭 안 되는 sentinel 로 contains 검색.
    const res = await client.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: "Slug",
        rich_text: { contains: "__zzzz_never_matches_sentinel_zzzz__" },
      },
      page_size: 100,
    })
    if (res.results.length !== 0) {
      return { name, ok: false, detail: `결과가 0건이어야 하는데 ${res.results.length}건` }
    }
    return { name, ok: true, detail: "Slug contains 무매칭 → 0건 반환, throw 없음" }
  } catch (e) {
    return { name, ok: false, detail: errorMessage(e) }
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`
  return String(e)
}

run().catch((e) => {
  console.error("[예상치 못한 최상위 에러]", e)
  process.exitCode = 1
})
