/**
 * Notion CMS 콘텐츠 페치 레이어.
 *
 * - 운영자가 Notion DB에서 Status=Published 로 표시한 글만 노출한다.
 * - Next.js 16 Cache Components 환경에서 동작하므로 각 함수는 비동기이며
 *   호출부에서 `"use cache"` + `cacheLife("minutes")` 패턴으로 ISR(약 60초)을 구성한다.
 * - NOTION_TOKEN / NOTION_DATABASE_ID 는 서버 전용 환경변수다.
 *   클라이언트 컴포넌트에서 직접 호출 금지. NEXT_PUBLIC_ 접두사 절대 사용 금지.
 *
 * 실제 구현은 W1(@notionhq/client + notion-to-md 연동) 단계에서 채운다.
 * 현재는 PRD에 정의된 시그니처와 빈 구현체만 잡아둔다.
 */

// 이 모듈은 서버 전용이다.
// 클라이언트 컴포넌트에서 import 하면 NOTION_TOKEN 이 번들에 포함될 수 있다.
// (server-only 가드 패키지를 추가하려면 `npm i server-only` 후 첫 줄에 import "server-only".)

import type { Category, Post, PostSummary, Tag } from "@/types"

// TODO(W1): @notionhq/client Client 인스턴스 생성
// const notion = new Client({ auth: process.env.NOTION_TOKEN })
// const DATABASE_ID = process.env.NOTION_DATABASE_ID

/** 발행된 글의 메타데이터를 최신순으로 가져온다. */
export async function getPosts(): Promise<PostSummary[]> {
  // TODO(W1): notion.databases.query({ filter: Status=Published, sorts: [PublishedAt desc] })
  return []
}

/** slug 로 단일 글을 가져온다. 없으면 null. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  // TODO(W1): databases.query + notion-to-md 로 마크다운 변환
  void slug
  return null
}

/** Notion select 속성에서 카테고리 목록을 추출한다. */
export async function getCategories(): Promise<Category[]> {
  // TODO(W2): getPosts() 결과를 카테고리별로 집계
  return []
}

/** Notion multi-select 속성에서 태그 목록을 추출한다. */
export async function getTags(): Promise<Tag[]> {
  // TODO(W2): getPosts() 결과를 태그별로 집계
  return []
}
