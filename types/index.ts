/**
 * Notion CMS 기반 블로그의 공통 타입.
 *
 * Notion DB 스키마(PRD `docs/NOTION_BLOG_PRD.md` DataTable 참고):
 *   Title(title), Slug(text, unique), Status(select),
 *   Category(select), Tags(multi-select), Summary(text),
 *   Cover(file/url), PublishedAt(date)
 */

export type PostStatus = "Draft" | "Published"

/** 글 목록 카드에 필요한 메타데이터(본문은 제외). */
export interface PostSummary {
  slug: string
  title: string
  summary: string
  category: string
  tags: string[]
  coverUrl: string | null
  publishedAt: string // ISO 8601
}

/** 글 상세에서 사용되는 풀 페이로드. notion-to-md 결과 마크다운 포함. */
export interface Post extends PostSummary {
  content: string // markdown
}

/** Notion select 속성 기반 카테고리. */
export interface Category {
  slug: string
  name: string
  postCount: number
}

/** Notion multi-select 속성 기반 태그. */
export interface Tag {
  slug: string
  name: string
  postCount: number
}

export type ThemeMode = "light" | "dark" | "system"
