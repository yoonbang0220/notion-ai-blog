/**
 * Notion CMS 콘텐츠 페치 레이어.
 *
 * - 운영자가 Notion DB에서 Status=Published 로 표시한 글만 노출한다.
 * - Next.js 16 Cache Components 환경에서 동작하므로 각 함수는 비동기이며
 *   호출부에서 `"use cache"` + `cacheLife("minutes")` 패턴으로 ISR(약 60초)을 구성한다.
 * - NOTION_TOKEN / NOTION_DATABASE_ID 는 서버 전용 환경변수다.
 *   클라이언트 컴포넌트에서 직접 호출 금지. NEXT_PUBLIC_ 접두사 절대 사용 금지.
 *
 * 참고: @notionhq/client v5 에서 `databases.query` 가 제거됐다.
 *   대신 `databases.retrieve` 로 data source 목록을 받아 `dataSources.query` 를 호출한다.
 *   사용자가 입력한 NOTION_DATABASE_ID 는 그대로 유지하고, 모듈 내부에서 첫 번째
 *   data source ID 로 한 번만 변환해 캐시한다.
 */

import "server-only"

import { Client, isFullDatabase, isFullPage } from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"

import type { Category, Post, PostSummary, Tag } from "@/types"

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`환경변수 누락: ${name} — .env.local 에 설정하세요.`)
  }
  return v
}

const NOTION_TOKEN = requireEnv("NOTION_TOKEN")
const NOTION_DATABASE_ID = requireEnv("NOTION_DATABASE_ID")

const notion = new Client({ auth: NOTION_TOKEN })

let cachedDataSourceId: string | null = null

async function resolveDataSourceId(): Promise<string> {
  if (cachedDataSourceId) return cachedDataSourceId
  const db = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID })
  if (!isFullDatabase(db)) {
    throw new Error(`Notion DB partial 응답 — ID 확인 필요: ${NOTION_DATABASE_ID}`)
  }
  const dataSourceId = db.data_sources[0]?.id
  if (!dataSourceId) {
    throw new Error(`Notion DB(${NOTION_DATABASE_ID}) 에 data source 가 없습니다.`)
  }
  cachedDataSourceId = dataSourceId
  return dataSourceId
}

/**
 * Status=Published 인 페이지를 PublishedAt 내림차순으로 모두 가져온다.
 * 100건 초과 시 start_cursor 로 페이지네이션 루프.
 *
 * 내부 헬퍼이지만 통합 테스트(scripts/test/notion-client.ts)에서 사용하므로 export 한다.
 */
export async function queryPublishedPages(): Promise<PageObjectResponse[]> {
  const data_source_id = await resolveDataSourceId()
  const collected: PageObjectResponse[] = []
  let start_cursor: string | undefined = undefined

  while (true) {
    const res = await notion.dataSources.query({
      data_source_id,
      filter: { property: "Status", select: { equals: "Published" } },
      sorts: [{ property: "PublishedAt", direction: "descending" }],
      page_size: 100,
      start_cursor,
    })
    for (const item of res.results) {
      if (isFullPage(item)) collected.push(item)
    }
    if (!res.has_more || !res.next_cursor) break
    start_cursor = res.next_cursor
  }
  return collected
}

/** 발행된 글의 메타데이터를 최신순으로 가져온다. */
export async function getPosts(): Promise<PostSummary[]> {
  // TODO(T1.2): queryPublishedPages 결과를 PostSummary 로 매핑
  return []
}

/** slug 로 단일 글을 가져온다. 없으면 null. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  // TODO(T1.3): Slug 필터 쿼리 + notion-to-md 로 마크다운 변환
  void slug
  return null
}

/** Notion select 속성에서 카테고리 목록을 추출한다. */
export async function getCategories(): Promise<Category[]> {
  // TODO(T1.4): getPosts() 결과를 카테고리별로 집계
  return []
}

/** Notion multi-select 속성에서 태그 목록을 추출한다. */
export async function getTags(): Promise<Tag[]> {
  // TODO(T1.4): getPosts() 결과를 태그별로 집계
  return []
}
