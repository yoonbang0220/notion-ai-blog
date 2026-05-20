/**
 * .env.local 의 Notion 키 3종이 "실제로 작동하는지" 확인하는 일회성 검증.
 *
 * 실행:
 *   node --env-file=.env.local --import tsx scripts/test/verify-keys.ts
 *
 * 검사 항목:
 *   1. NOTION_TOKEN / NOTION_DATABASE_ID / NOTION_ITEMS_DATABASE_ID 존재 여부
 *   2. 토큰 유효성 + 견적 DB(Invoice) 접근 — databases.retrieve
 *   3. 토큰 유효성 + 항목 DB(Items) 접근 — databases.retrieve
 *   4. 견적 DB 에서 상태=발행 시드 페치 (dataSources.query, 한글 컬럼)
 *
 * 401 → 토큰이 틀림.  ObjectNotFound → ID 오타 또는 Integration 미connect.
 */

import {
  APIErrorCode,
  APIResponseError,
  Client,
  isFullDatabase,
} from "@notionhq/client"

type Check = { name: string; ok: boolean; detail: string }

function diagnose(e: unknown): string {
  if (APIResponseError.isAPIResponseError(e)) {
    if (e.code === APIErrorCode.Unauthorized) {
      return "401 Unauthorized — NOTION_TOKEN 이 틀렸습니다."
    }
    if (e.code === APIErrorCode.ObjectNotFound) {
      return "ObjectNotFound — DB ID 오타이거나 Integration 이 이 DB 에 connect 안 됨."
    }
    return `${e.code}: ${e.message}`
  }
  if (e instanceof Error) return `${e.name}: ${e.message}`
  return String(e)
}

async function retrieveDb(
  client: Client,
  label: string,
  dbId: string | undefined,
): Promise<Check> {
  const name = `${label} 접근`
  if (!dbId) return { name, ok: false, detail: "환경변수 미설정" }
  try {
    const db = await client.databases.retrieve({ database_id: dbId })
    if (!isFullDatabase(db)) return { name, ok: false, detail: "partial 응답" }
    const title = db.title.map((t) => t.plain_text).join("") || "(제목 없음)"
    const dsId = db.data_sources[0]?.id ?? "없음"
    return {
      name,
      ok: true,
      detail: `OK — 이름="${title}", data_source=${dsId.slice(0, 8)}…`,
    }
  } catch (e) {
    return { name, ok: false, detail: diagnose(e) }
  }
}

async function queryPublishedSeeds(
  client: Client,
  dbId: string | undefined,
): Promise<Check> {
  const name = "견적 DB 상태=발행 시드 페치"
  if (!dbId) return { name, ok: false, detail: "NOTION_DATABASE_ID 미설정" }
  try {
    const db = await client.databases.retrieve({ database_id: dbId })
    if (!isFullDatabase(db)) return { name, ok: false, detail: "partial 응답" }
    const dataSourceId = db.data_sources[0]?.id
    if (!dataSourceId) return { name, ok: false, detail: "data source 없음" }
    const res = await client.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "상태", select: { equals: "발행" } },
      page_size: 100,
    })
    return {
      name,
      ok: res.results.length >= 1,
      detail: `상태=발행 견적 ${res.results.length}건 페치`,
    }
  } catch (e) {
    return { name, ok: false, detail: diagnose(e) }
  }
}

async function run() {
  const token = process.env.NOTION_TOKEN
  const dbId = process.env.NOTION_DATABASE_ID
  const itemsId = process.env.NOTION_ITEMS_DATABASE_ID

  const presence: Check[] = [
    {
      name: "NOTION_TOKEN 존재",
      ok: !!token,
      detail: token ? `${token.slice(0, 7)}… (${token.length}자)` : "비어있음",
    },
    {
      name: "NOTION_DATABASE_ID 존재",
      ok: !!dbId,
      detail: dbId ?? "비어있음",
    },
    {
      name: "NOTION_ITEMS_DATABASE_ID 존재",
      ok: !!itemsId,
      detail: itemsId ?? "비어있음",
    },
  ]

  const results: Check[] = [...presence]
  if (token) {
    const client = new Client({ auth: token })
    results.push(await retrieveDb(client, "견적 DB(Invoice)", dbId))
    results.push(await retrieveDb(client, "항목 DB(Items)", itemsId))
    results.push(await queryPublishedSeeds(client, dbId))
  }

  console.log("\n=== Notion 키 검증 결과 ===")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  console.log(
    failed.length === 0
      ? "\n🎉 키 3종 모두 정상 작동합니다."
      : `\n⚠ ${failed.length}건 실패 — 위 detail 확인.`,
  )
  process.exitCode = failed.length > 0 ? 1 : 0
}

run().catch((e) => {
  console.error("[예상치 못한 최상위 에러]", e)
  process.exitCode = 1
})
