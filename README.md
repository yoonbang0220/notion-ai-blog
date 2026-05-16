# Notion CMS 기반 AI 학습 블로그

AI를 처음 공부하는 사람을 위한 학습 노트 블로그.
운영자가 Notion DB 에 글을 쓰고 `Status=Published` 로 바꾸면 약 1분 안에 웹에 노출된다.

> 단일 출처(SSOT): [`docs/NOTION_BLOG_PRD.md`](./docs/NOTION_BLOG_PRD.md)

## 기술 스택

| 패키지 | 역할 |
|---|---|
| Next.js 16 (App Router, Cache Components) | 프레임워크 |
| React 19 / TypeScript 5 (strict) | 언어/런타임 |
| Tailwind CSS v4 + shadcn/ui (base-nova, `@base-ui/react`) | UI |
| `@notionhq/client` + `notion-to-md` | Notion 콘텐츠 페치/변환 |
| `react-markdown` + `remark-gfm` + `rehype-highlight` | 마크다운 렌더링 |
| next-themes, sonner, lucide-react | 부가 기능 |

## 시작하기

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 에 NOTION_TOKEN, NOTION_DATABASE_ID 입력

# 개발 서버 (Turbopack)
npm run dev      # http://localhost:3000

# 프로덕션 빌드 / 실행
npm run build
npm start

# 린트 / 포맷
npm run lint
npx prettier --write .
```

## 페이지

| 경로 | 설명 |
|---|---|
| `/` | 홈 (Hero + 카테고리 칩 + 최신 글 6개) |
| `/posts` | 전체 글 목록 |
| `/posts/[slug]` | 글 상세 (마크다운 본문, OG 메타데이터) |
| `/category/[slug]` | 카테고리별 목록 |
| `/tag/[slug]` | 태그별 목록 |
| `/about` | 운영자 소개 |
| `/api/revalidate` | Make/Zapier 등 외부 자동화 webhook (Bearer 인증) |

모든 페이지 스켈레톤은 `lib/notion.ts` 의 시그니처만 잡힌 상태에서도 빈 응답으로 안전 렌더된다. 실제 콘텐츠는 `lib/notion.ts` 의 `getPosts` / `getPostBySlug` / `getCategories` / `getTags` 를 채우면 자동 표시된다.

## 폴더 구조

```
app/                          # 페이지·라우트 핸들러
components/
  ui/                         # shadcn/ui (base-nova) — button, card, field, input, label, separator, sonner
  common/                     # Header, Footer, ThemeProvider, ThemeToggle
lib/
  notion.ts                   # Notion CMS 페치 레이어 (서버 전용)
  utils.ts                    # cn() — clsx + tailwind-merge
types/index.ts                # 블로그 도메인 타입
docs/NOTION_BLOG_PRD.md       # MVP PRD (SSOT)
```

## Next.js 16 핵심 사용 패턴

### `"use cache"` + `cacheLife` 로 ISR 표현

`cacheComponents: true` 환경에서는 `export const revalidate` 대신 다음 패턴을 쓴다.

```tsx
import { cacheLife } from "next/cache"

async function getCachedPosts() {
  "use cache"
  cacheLife("minutes") // PRD 의 "ISR 60초" 에 매핑
  return getPosts()
}
```

### 동적 라우트는 Suspense 안에서 데이터 페치

`params` 가 Promise 이므로 await 하는 부분이 캐시 밖에 있으면 prerender 가 실패한다. 셸과 데이터 컴포넌트를 분리한다.

```tsx
export default function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <PostContent params={params} />
    </Suspense>
  )
}
```

전체 패턴은 `app/posts/[slug]/page.tsx` 참고.

## 환경 변수

| 변수 | 용도 | 비고 |
|---|---|---|
| `NOTION_TOKEN` | Notion Internal Integration Token | 서버 전용 |
| `NOTION_DATABASE_ID` | Posts DB ID | 서버 전용 |
| `NOTION_REVALIDATE_SECRET` | `/api/revalidate` 인증 토큰 | 선택 |
| `NEXT_PUBLIC_APP_URL` | 사이트 절대 URL | OG·canonical 등에 사용 |
| `NEXT_PUBLIC_APP_NAME` | 사이트 이름 | 표시용 |

⚠️ Notion 관련 변수에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 말 것 (토큰 유출).

## 라이선스

MIT
