# ROADMAP — Notion CMS 기반 AI 학습 블로그 MVP

> 최종 업데이트: 2026-05-17
> 기반 문서: [`docs/NOTION_BLOG_PRD.md`](./NOTION_BLOG_PRD.md) (작성일 2026-05-16)
> 작성자: prd-roadmap-architect

---

## 1. 개요

### 1.1 프로젝트 정체성
- **무엇**: 운영자가 Notion DB에서 작성한 글을 ISR 60초로 자동 퍼블리싱하는 AI 학습 블로그.
- **누가**: AI 입문자(비개발자 포함). 1차 페르소나는 28세 마케터 "김지원".
- **왜**: "초보가 쓴 초보 가이드" 톤으로 진입장벽을 낮춰, 입문자가 한 편이라도 끝까지 읽고 "나도 따라할 수 있겠다"는 자신감을 얻게 한다.
- **무엇을 만드는가(MVP)**: 홈 / 글 목록 / 글 상세 / 카테고리·태그 필터 / 클라이언트 검색 / Notion 파이프라인 / on-demand revalidate webhook.

### 1.2 전제·제약
- **개발 자원**: 파트타임 3주 (W1 ~ W3, 시작 기준 2026-05-17).
- **단일 출처(SSOT)**: PRD `docs/NOTION_BLOG_PRD.md`. 기능·우선순위 변경은 PRD를 먼저 갱신한다.
- **검색 범위 가정**: 글 100개 이하 → 클라이언트 사이드 키워드 매칭. 초과 시 Future Work(Algolia/Meilisearch)로 분리.
- **호스팅**: Vercel (ISR + Edge), 도메인 W3에서 결정.
- **기술 함정 (반드시 준수)**
  - Next.js 16.2.6: `params` / `searchParams` 는 `Promise` 타입 → **반드시 `await`**.
  - `cacheComponents: true` 활성 → 동적 라우트의 데이터 페치 컴포넌트는 **`<Suspense>` 안에 배치 필수** (현재 `app/posts/[slug]/page.tsx` 패턴이 표준).
  - ISR은 `"use cache"` + `cacheLife("minutes")` 패턴. **`export const revalidate = N` 사용 금지**.
  - shadcn/ui는 `@base-ui/react` 기반(Radix 아님) → props·API는 항상 실제 컴포넌트 파일에서 확인.
  - `NOTION_TOKEN` / `NOTION_DATABASE_ID` 는 **서버 전용**. `NEXT_PUBLIC_` 접두사 절대 금지.
  - `lib/notion.ts` 는 클라이언트 컴포넌트에서 import 금지(`server-only` 가드 추가 권장).

### 1.3 현재 코드베이스 상태 (2026-05-17 기준)
- 라우트 골격: `app/page.tsx`, `app/posts/page.tsx`, `app/posts/[slug]/page.tsx`, `app/category/[slug]/page.tsx`, `app/tag/[slug]/page.tsx`, `app/about/page.tsx`, `app/api/revalidate/route.ts` 모두 존재.
- 모든 페이지는 `getPosts() / getCategories() / getPostBySlug()` 호출 + `"use cache"` + `cacheLife("minutes")` 패턴이 적용되어 있으며, 빈 응답을 안전히 처리한다.
- `lib/notion.ts` 는 시그니처와 빈 구현체만 존재 → **W1에서 본격 구현 필요**.
- `types/index.ts` 는 `PostSummary`, `Post`, `Category`, `Tag`, `PostStatus` 정의 완료.
- shadcn/ui 컴포넌트: `button`, `card`, `field`, `input`, `label`, `separator`, `sonner` 존재.
- 의존성 설치 완료: `@notionhq/client@^5.21.0`, `notion-to-md@^3.1.9`, `react-markdown@^10.1.0`, `remark-gfm@^4.0.1`, `rehype-highlight@^7.0.2`.
- `.env.example` 에 `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_REVALIDATE_SECRET` 변수 명시.

> ✅ **재사용 포인트**: 이미 만들어진 페이지 셸을 다시 만들지 말 것. `lib/notion.ts` 함수 본문만 채우면 모든 페이지가 자동으로 데이터를 받는 구조.

---

## 2. 마일스톤 요약

| 주차 | 기간 | 테마 | 핵심 산출물 | 검증 기준(DoD) |
|------|------|------|-------------|----------------|
| **W1** | 2026-05-17 ~ 2026-05-23 | 데이터 파이프라인 + 글 상세 렌더 | `lib/notion.ts` 실제 구현, 마크다운 렌더러, 시드 글 2~3편 노출 | 로컬에서 `/posts`, `/posts/[slug]` 가 실제 Notion 콘텐츠를 렌더하고, 시드 글의 코드/이미지가 정상 표시 |
| **W2** | 2026-05-24 ~ 2026-05-30 | 발견성 (카테고리·태그·검색·홈) | 카테고리/태그 라우트 데이터 연결, 검색바, 홈 카테고리 칩 + 최신 글, "같은 카테고리 추천 3개" | 사용자가 카테고리·태그·검색 어느 경로로도 글을 찾을 수 있고, 홈에서 6개 카드/카테고리 칩이 실제 데이터로 렌더 |
| **W3** | 2026-05-31 ~ 2026-06-06 | 운영 안정화 + 런칭 | ISR 검증, on-demand revalidate 연결, 시드 글 10편, Vercel 배포·도메인 연결, 카피 검수 | 정식 도메인에서 모든 페이지가 200 응답, Notion에서 글을 발행하면 60초 이내 노출, Lighthouse(모바일) 성능 ≥ 80 |

> 📌 **가정 (W1~W3 일정 산정 기준)**
> - 운영자(개발자) 1인이 주당 약 15~20시간 투입.
> - Notion DB 스키마는 PRD DataTable과 1:1 일치하도록 사전에 만들어둔다(T0.1).
> - Vercel 무료 플랜 한도 내(빌드 100/일, 함수 100k/월) 동작.
> - 시드 글 10편은 운영자가 W2~W3 사이 병렬 작성.

---

## 3. Phase별 상세 태스크

태스크 ID 컨벤션: `T<주차>.<번호>`. Size 는 S(<2h) / M(0.5~1d) / L(1~2d) / XL(>2d).
담당 영역: `infra` / `data` / `ui` / `qa` / `ops` / `copy`.

### Phase 0 — 사전 준비 (착수 전 0.5일)

| ID | 제목 | 담당 | Size | 선행 | 산출물 | DoD | 테스트 | 함정·메모 |
|----|------|------|------|------|--------|-----|--------|----------|
| T0.1 | Notion `Posts` DB 생성 | ops | S | — | Notion 워크스페이스의 Posts DB | 속성 9종(`Title`, `Slug`, `Status`, `Category`, `Tags`, `Summary`, `Cover`, `PublishedAt`, `(본문 페이지)`) 모두 존재. Integration 공유 권한 부여. | 수동(체크리스트) | `Slug` 는 text + 운영자가 직접 채움. 중복 시 빌드 실패 처리할 예정이므로 작성 가이드 마련. |
| T0.2 | Notion Internal Integration 발급 | ops | S | T0.1 | `NOTION_TOKEN` 문자열 | `.env.local` 에 토큰 입력. Posts DB Share → Integration 권한 확인. | 수동(체크리스트) | `NEXT_PUBLIC_` 절대 금지. `.env.local` 은 `.gitignore` 됨을 재확인. |
| T0.3 | `.env.local` 채우기 + 환경변수 검증 | infra | S | T0.2 | `.env.local` (gitignored) | `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_REVALIDATE_SECRET` 3종 모두 채움. `npm run dev` 부팅 OK. | 수동 | `NOTION_REVALIDATE_SECRET` 은 32자 이상 랜덤. 운영/개발 동일 값 사용 금지(W3에서 분리). |
| T0.4 | `server-only` 가드 도입 | infra | S | — | `npm i server-only`, `lib/notion.ts` 상단 `import "server-only"` | 클라이언트 컴포넌트에서 `lib/notion.ts` import 시 빌드 에러. | 통합(빌드) | CLAUDE.md 의 "NOTION_TOKEN 클라이언트 노출 방지" 가드. |

#### Phase 0 테스트 계획
- **T0.3** (수동): `.env.local` 작성 후 `npm run dev` 부팅 → 콘솔에 env 누락 경고 없음. 잘못된 토큰(예: 비어있는 값) 시나리오는 T1.1 단위 테스트에서 401 처리로 커버.
- **T0.4** (통합/빌드): 임시로 클라이언트 컴포넌트(`"use client"` 파일)에서 `import { getPosts } from "@/lib/notion"` 추가 → `npm run build` 가 즉시 실패하는지 확인 → 원복.

---

### Phase 1 (W1) — 데이터 파이프라인 + 글 상세 렌더

> **목표**: Notion → 마크다운 → 화면. 시드 글 2~3편이 `/posts/[slug]` 에서 코드 하이라이트·이미지 포함 정상 렌더되어야 한다.

| ID | 제목 | 담당 | Size | 선행 | 산출물 | DoD | 테스트 | 함정·메모 |
|----|------|------|------|------|--------|-----|--------|----------|
| T1.1 | Notion Client 인스턴스 + DB 쿼리 헬퍼 | data | M | T0.3 | `lib/notion.ts` 내부 `notion = new Client({...})`, `DATABASE_ID`, `queryPublishedPages()` private 헬퍼 | `notion.databases.query({ filter: { property: "Status", select: { equals: "Published" } }, sorts: [{ property: "PublishedAt", direction: "descending" }] })` 가 응답 반환. | 단위+통합 | `@notionhq/client` v5 응답 타입(`PageObjectResponse`)이 union 이라 narrowing 필요. 미리 internal 타입 가드(`isFullPage`) 정의. |
| T1.2 | `getPosts()` 실제 구현 (PostSummary 매핑) | data | M | T1.1 | `lib/notion.ts` 의 `getPosts(): Promise<PostSummary[]>` 본문 | Notion property → `PostSummary` 변환. `title`, `slug`, `summary`, `category`, `tags[]`, `coverUrl`, `publishedAt`(ISO) 모두 채워짐. 필수 속성 누락 글은 `console.warn` 후 스킵. | 단위 | Notion `title` 속성은 `rich_text` 배열 → `plain_text` join. `coverUrl` 은 `file.expiry_time` 1시간 → 표시 시 `next/image` 재호스팅 권장(T1.6에서 처리). |
| T1.3 | `getPostBySlug(slug)` + notion-to-md 변환 | data | L | T1.2 | `lib/notion.ts` 의 `getPostBySlug(slug): Promise<Post \| null>` 본문 | `Slug` 필터 쿼리 → 페이지 ID 추출 → `NotionToMarkdown` 으로 본문 변환 → `Post.content`(string) 반환. 없으면 `null`. | 단위+통합 | `notion-to-md@3.x` 는 `md.toMarkdownString(md.pageToMarkdown(pageId))` 형식. code 블록 언어 보존을 위해 `convertImagesToBase64: false` 유지. |
| T1.4 | `getCategories()` / `getTags()` 집계 | data | S | T1.2 | `lib/notion.ts` 의 두 함수 본문 | `getPosts()` 결과를 in-memory 집계 → `{ slug, name, postCount }`. `slug` 는 URL-safe(공백→`-`, 한글 허용). | 단위 | 같은 페치 호출을 두 번 하지 않도록 같은 함수 내에서 `await getPosts()` 한 번만 호출. 호출부의 `"use cache"` 가 dedup 처리하지만, 함수 내부에서도 한 번만 호출이 명확. |
| T1.5 | Slug 중복 검증 (빌드 실패) | data/qa | S | T1.2 | `lib/notion.ts` `getPosts()` 내부 검증 로직 | 동일 slug 가 2건 이상이면 `throw new Error("Duplicate slug: <slug>")`. 빌드 시 즉시 실패. | 단위 | 운영자 작성 실수 예방 가드. PRD 정합성 규칙 직접 반영. |
| T1.6 | 마크다운 렌더러 컴포넌트 | ui | L | T1.3 | `components/post/post-content.tsx` (서버 컴포넌트) | `react-markdown` + `remark-gfm` + `rehype-highlight` 조합. `code` 블록은 `hljs` 스타일, `img` 태그는 `next/image` 로 래핑(LCP 최적화). `app/posts/[slug]/page.tsx` 의 placeholder `<pre>` 영역 교체. | Playwright E2E | `rehype-highlight` CSS 테마는 `app/globals.css` 에 `@import "highlight.js/styles/github.css"` (라이트) + `@import "highlight.js/styles/github-dark.css" (prefers-color-scheme: dark)` 로 분기. `react-markdown` 의 `components` prop 으로 `img` 오버라이드. |
| T1.7 | 코드 하이라이트 CSS 테마 적용 + 다크모드 분기 | ui | S | T1.6 | `app/globals.css` 갱신 | `.dark` 클래스 토글 시 코드 블록 다크 테마로 전환. | Playwright E2E | `next-themes` 가 `.dark` 클래스 토글 → `@custom-variant dark` 와 일치. CSS 변수 충돌 주의. |
| T1.8 | 시드 글 2~3편 작성 (W1 검증용) | copy | M | T1.6 | Notion DB 에 Published 글 2~3편 (코드, 이미지, h1~h3, 목록 포함) | `/posts` 카드 그리드 + `/posts/[slug]` 본문 모두 정상 렌더. | 수동(체크리스트) | "초보 톤" 적용 — 본격 카피 검수는 T3.7 에서. |
| T1.9 | 글 상세 페이지 메타데이터(OG) 검증 | qa | S | T1.6, T1.8 | 브라우저 DevTools 확인 | `generateMetadata` 가 `title`, `description`, `og:image` 채움. `coverUrl` 없을 때도 페이지 정상 렌더. | Playwright E2E | `app/posts/[slug]/page.tsx` 의 `generateMetadata` 는 이미 구현됨 — 데이터 흐름만 검증. |

#### Phase 1 테스트 계획

> 단위/통합 테스트는 러너가 미설정이므로 **`tsx` 또는 `node --import tsx` 기반의 임시 스크립트**(`scripts/test/*.ts`)로 실행하거나, MVP 단계에서는 콘솔 출력 + 수동 어서션도 허용. Playwright E2E 는 **MCP**(`mcp__playwright__*`)를 통해 실행한다.

- **T1.1 Notion Client 헬퍼**
  - 정상: 유효 토큰 + DB ID → `queryPublishedPages()` 가 배열 반환, 각 항목 `object === "page"`.
  - 실패 — 인증: `NOTION_TOKEN` 을 의도적으로 잘못된 값으로 바꾼 임시 클라이언트 → 401(`APIErrorCode.Unauthorized`) 캐치 + 명확한 에러 메시지.
  - 실패 — DB 미공유: 올바른 토큰이지만 Integration 미공유 DB ID → 404 캐치, 운영자에게 "Integration 권한을 확인하세요" 안내.
  - 엣지 — 네트워크 에러/타임아웃: `fetch` 모킹 또는 잘못된 base URL → 예외 전파.
  - 엣지 — 빈 결과: `Status=Published` 글 0건 → `[]` 반환, throw 없음.
- **T1.2 `getPosts()` 매핑**
  - 정상: 모든 필수 속성이 채워진 1건 → `PostSummary` 모든 필드(특히 `publishedAt` ISO 형식) 정상.
  - 엣지 — 필수 누락: `Title` 또는 `Slug` 없는 항목 → `console.warn` 1회 + 결과 배열에서 스킵.
  - 엣지 — Cover 없음: `Cover` 속성 비어있는 글 → `coverUrl: null`, 페이지에서 fallback 처리.
  - 엣지 — 빈 DB: `queryPublishedPages()` 가 `[]` → `getPosts()` 도 `[]` 반환, 페이지 빈 상태 분기 정상.
  - 엣지 — 멀티 카테고리: Select 1개 vs Multi-select Tag → 각각 string / string[] 매핑 검증.
- **T1.3 `getPostBySlug` + notion-to-md**
  - 정상: 존재하는 slug → `Post` 반환, `content` 비어있지 않음.
  - 정상 — 코드 블록: notion 의 ```ts 블록이 마크다운에서 ```` ```ts ```` 로 언어 정보 보존되어야 함.
  - 정상 — 이미지 포함: 이미지 블록 → `![alt](url)` 형식, URL 은 Notion `file.url` 또는 `external.url`.
  - 실패 — 없는 slug: `getPostBySlug("nonexistent")` → `null` (throw 아님), 페이지에서 `notFound()` 호출 가능.
  - 엣지 — 동명 slug 다수: T1.5 의 검증과 별개로 `getPostBySlug` 는 첫 결과 반환(또는 throw — 결정 필요).
- **T1.4 `getCategories()` / `getTags()`**
  - 정상: 카테고리 3종 × 글 5건 → `{ slug, name, postCount }` 정확.
  - 엣지 — 빈 DB: `[]` 반환.
  - 엣지 — 동일 이름 다른 케이스(`AI강의` vs `ai강의`): 정규화 정책 결정 후 단위 테스트 잠금.
- **T1.5 Slug 중복 검증**
  - 정상(통과): slug 모두 유니크 → throw 없음.
  - 실패: 동일 slug 2건 → `Error("Duplicate slug: <slug>")` throw, 메시지에 충돌 slug 명시.
  - 엣지 — 빈 배열: throw 없음.
- **T1.6 PostContent 렌더러 — Playwright MCP E2E**
  - 사전: `npm run dev` 실행, 시드 글 1편(코드+이미지+h1~h3+목록 포함) 발행 상태.
  - `mcp__playwright__browser_navigate { url: "http://localhost:3000/posts/<seed-slug>" }`
  - `mcp__playwright__browser_snapshot` → ARIA 트리에서 `heading[level=1]`(글 제목), `heading[level=2/3]` 존재 확인.
  - `mcp__playwright__browser_evaluate { function: "() => document.querySelectorAll('pre code.hljs').length" }` → ≥ 1 (코드 하이라이트 적용 클래스).
  - `mcp__playwright__browser_console_messages` → `error`/`warning` 레벨 메시지 0건.
  - `mcp__playwright__browser_take_screenshot { filename: "t1-6-light.png", fullPage: true }`.
- **T1.7 다크모드 코드 하이라이트 — Playwright MCP E2E**
  - 위 시드 글에서 `mcp__playwright__browser_click` 으로 `ThemeToggle` 클릭 → 다크 모드 진입.
  - `mcp__playwright__browser_evaluate { function: "() => document.documentElement.classList.contains('dark')" }` → `true`.
  - `mcp__playwright__browser_take_screenshot { filename: "t1-7-dark.png", fullPage: true }` → 라이트 스크린샷과 시각 차이.
- **T1.9 OG 메타 — Playwright MCP E2E**
  - `mcp__playwright__browser_navigate` 후 `mcp__playwright__browser_evaluate { function: "() => ({ title: document.title, og: document.querySelector('meta[property=\"og:image\"]')?.content })" }` → `title`/`og:image` 모두 비어있지 않음.
  - `coverUrl` 없는 글 1편 추가 발행 → 같은 평가에서 페이지 200 응답 + OG 폴백 동작.

**Phase 1 완료 정의(DoD)**
- 로컬 `npm run dev` 에서 `/`, `/posts`, `/posts/[slug]` 가 실제 Notion 데이터로 렌더된다.
- 코드 블록·이미지·표(GFM) 가 시드 글에서 정상 표시된다.
- 빈 응답(0건)·없는 slug(`notFound()`) 분기가 깨지지 않는다.
- `npm run build` 통과, Slug 중복 시 빌드가 즉시 실패한다.
- **위 Phase 1 테스트 계획의 시나리오가 모두 통과(Playwright MCP 실측 포함). 단위/통합 테스트 결과는 콘솔 또는 임시 스크립트 출력으로 자기 검증.**

**Phase 1 리스크**
- ⚠️ `cacheComponents: true` 환경에서 페치 함수를 잘못된 위치에서 호출하면 `Uncached data was accessed outside of <Suspense>` 빌드 에러 — 패턴은 `app/posts/[slug]/page.tsx` 의 `PostContent` 구조를 그대로 따른다.
- ⚠️ Notion 이미지 URL 의 1시간 만료(`file.expiry_time`) — `next/image` 재호스팅으로 우회하되, 캐시 만료 시점에 이미지 깨짐 가능 → T3.4 webhook + ISR 재생성으로 보강.

---

### Phase 2 (W2) — 발견성 (카테고리·태그·검색·홈)

> **목표**: 사용자가 어떤 경로로 들어와도 원하는 글을 3 클릭 이내 도달. 홈은 카테고리 칩 + 최신 글 6개.

| ID | 제목 | 담당 | Size | 선행 | 산출물 | DoD | 테스트 | 함정·메모 |
|----|------|------|------|------|--------|-----|--------|----------|
| T2.1 | 카테고리 페이지 데이터 검증 + 한글 slug 인코딩 | ui/data | S | T1.4 | `app/category/[slug]/page.tsx` 동작 확인, 필요 시 `decodeURIComponent` 처리 | `/category/AI강의` 등 한글 slug URL 정상 동작. 0건일 때 안내 표시. | Playwright E2E | 현재 코드가 `p.category === slug` 단순 비교 — slug 가 `name` 그대로면 한글 URL 인코딩됨. `getCategories()` 가 반환하는 `slug` 와 동일 키여야 함. |
| T2.2 | 태그 페이지 데이터 검증 + 인코딩 | ui/data | S | T1.4 | `app/tag/[slug]/page.tsx` 동작 확인 | `/tag/GPT` 등 정상 동작. 0건 안내. | Playwright E2E | T2.1 과 동일한 slug 정규화 정책 공유. |
| T2.3 | 홈 카테고리 칩 + 최신 글 6개 검증 | ui | S | T1.4, T1.2 | `app/page.tsx` 가 실제 데이터로 렌더 | 카테고리 칩에 글 수 카운트 표시. 글 0건 시 가이드 문구. | Playwright E2E | 이미 페이지가 구현됨 — 데이터 흐름만 검증. |
| T2.4 | 클라이언트 검색바 컴포넌트 | ui | L | T1.2 | `components/posts/search-bar.tsx` (`"use client"`) + `app/posts/page.tsx` 통합 | 입력값으로 `title` + `summary` + `tags` 에 대해 `includes` 매칭 (대소문자 무시). 결과 즉시 필터링. `field.tsx` + `input.tsx` 조합 사용. | Playwright E2E | **`@base-ui/react` 기반** — Radix props 와 다름. `field.tsx` 의 `Field`/`FieldLabel` 사용 패턴은 기존 컴포넌트 파일 확인. 폼이 아닌 단순 검색은 `input.tsx` 단독 사용도 OK. |
| T2.5 | 검색 인덱스 데이터 흐름 결정 | data | S | T2.4 | 빌드 시 단일 JSON 로드 vs 페이지 prop 전달 결정 문서화 | 글 100개 이하 가정 하에 SSR 페이지에서 `PostSummary[]` 를 클라이언트 컴포넌트로 prop 전달. 별도 API 라우트 불필요. | 통합(번들 크기) | `fuse.js` 도입은 50개 초과 시점에 재검토 — MVP 는 `includes` 로 충분. 의존성 추가 미루기. |
| T2.6 | "같은 카테고리 추천 3개" 섹션 | ui | M | T1.2 | `app/posts/[slug]/page.tsx` 하단 `<RelatedPosts>` 컴포넌트 추가 | 현재 글 제외, 같은 카테고리 글 최대 3개. 0건 시 섹션 숨김. | Playwright E2E | `Suspense` 안에 두거나 부모 `PostContent` 내부에서 호출. 추가 `await getPosts()` 는 `"use cache"` 덕에 dedup 됨. |
| T2.7 | About 페이지 보강 | ui/copy | S | — | `app/about/page.tsx` 에 운영자 사진 placeholder, 메일/SNS 링크, 다룬 도구 리스트 추가 | TODO 주석 제거. 실제 정보로 채움. | 수동(체크리스트) | 초보 톤 유지. 운영자 개인정보 노출 범위 사전 결정. |
| T2.8 | Header 네비게이션 정리 | ui | S | — | `components/common/Header.tsx` 의 메뉴를 `홈 / 글 / About` 으로 정렬 | 모바일 햄버거 또는 가로 메뉴 일관성 확인. | Playwright E2E | 스타터킷 잔여 메뉴(로그인 등) 남아있는지 마지막 점검. |
| T2.9 | Footer 카피·링크 정리 | ui/copy | S | — | `components/common/Footer.tsx` 갱신 | 운영자 이름·연도·간단 카피. | 수동(체크리스트) | 외부 SNS 링크는 `rel="noopener noreferrer"` 필수. |
| T2.10 | 404(`not-found`) 페이지 톤 다듬기 | ui/copy | S | — | `app/not-found.tsx` | "초보 톤"으로 안내, `/posts` 와 `/` 로 가는 버튼. | Playwright E2E | — |

#### Phase 2 테스트 계획

- **T2.1 카테고리 페이지 — Playwright MCP E2E**
  - 정상: `mcp__playwright__browser_navigate { url: "http://localhost:3000/category/AI강의" }` (브라우저가 자동 인코딩) → `mcp__playwright__browser_snapshot` 으로 글 카드 목록 노출 확인.
  - 엣지 — 0건: 글이 없는 카테고리 slug → "이 카테고리에는 아직 글이 없습니다" 등 안내 텍스트 ARIA 트리 존재.
  - 엣지 — 인코딩: `%EC%9D%B8%EC%BD%94%EB%94%A9%EB%90%9C` 형식의 직접 URL 입력 → 동일 결과.
  - 엣지 — 없는 slug: 존재하지 않는 카테고리 → 0건 안내 또는 `notFound()` 처리 (결정 후 잠금).
- **T2.2 태그 페이지 — Playwright MCP E2E**
  - 정상: `/tag/GPT` 이동 → 매칭 글 표시.
  - 엣지 — 0건 / 미존재 slug: T2.1 과 동일 패턴.
- **T2.3 홈 — Playwright MCP E2E**
  - 정상: `/` 이동 → `mcp__playwright__browser_snapshot` 으로 카테고리 칩 ≥ 1개, 최신 글 카드 ≤ 6개 확인.
  - 엣지 — 0건: 시드 글 모두 Draft 로 변경 후 페이지 이동 → 가이드 문구 노출 (테스트 후 원복).
  - 검증: `mcp__playwright__browser_evaluate { function: "() => document.querySelectorAll('article').length" }` 또는 카드 셀렉터.
- **T2.4 검색바 — Playwright MCP E2E**
  - 사전: `/posts` 이동.
  - 정상: `mcp__playwright__browser_type { ref: <검색 input>, text: "GPT" }` → 결과 카드 수가 입력 전보다 감소, 모든 카드 텍스트에 "GPT" 포함(대소문자 무시).
  - 엣지 — 대소문자: `gpt` 입력 → 동일 결과.
  - 엣지 — 빈 결과: `zzzzz_no_match` 입력 → "검색 결과 없음" 안내 + "전체 글 보기" 폴백 CTA.
  - 엣지 — 입력 비움: 텍스트 삭제 → 전체 글로 복원.
  - 엣지 — 한글: "도구" 입력 → tag/summary 에 "도구" 포함된 글만 노출.
- **T2.5 검색 데이터 흐름 — 통합(번들 크기)**
  - 빌드 후 `/posts` 페이지의 `__next` HTML 또는 RSC payload 크기 확인 → gzipped < 200KB (R 리스크 게이트).
- **T2.6 RelatedPosts — Playwright MCP E2E**
  - 정상: 같은 카테고리 글 ≥ 4편 보장한 시드 → 상세 페이지 하단에 정확히 3개 카드 노출, 현재 글 slug 미포함.
  - 엣지 — 동일 카테고리 1편(자기 자신): 섹션 자체가 DOM 에 없어야 함 → `mcp__playwright__browser_evaluate { function: "() => !!document.querySelector('[data-testid=\"related-posts\"]')" }` → `false`.
  - 엣지 — 2편: 정확히 2개 노출(3개 미만도 표시).
- **T2.7 / T2.9** (수동 체크리스트): TODO 주석 grep 결과 0건, About 의 메일 링크 클릭 시 `mailto:` 동작, Footer SNS 링크 `rel="noopener noreferrer"` 속성 존재.
- **T2.8 Header — Playwright MCP E2E**
  - `mcp__playwright__browser_navigate` `/` → `mcp__playwright__browser_snapshot` → 메뉴 항목이 "홈 / 글 / About" 셋이며 로그인/회원가입 잔재 0건.
  - `mcp__playwright__browser_resize { width: 375, height: 812 }` → 모바일 메뉴(햄버거 또는 가로) 정상 노출 + 클릭 동작.
- **T2.10 404 — Playwright MCP E2E**
  - `/__nonexistent_path__` 이동 → `mcp__playwright__browser_snapshot` 으로 안내 카피 + `/posts`·`/` 링크 2종 존재 확인.

**Phase 2 완료 정의(DoD)**
- 카테고리·태그 URL이 한글 slug 포함해도 정상 동작.
- `/posts` 에서 키워드 입력 시 클라이언트 필터링이 즉시 반영.
- 홈에서 카테고리 칩과 최신 글 6개가 실제 데이터로 표시.
- 글 상세 하단에 "같은 카테고리 추천 3개" 가 출력.
- Lighthouse(모바일) 접근성 ≥ 90.
- **위 Phase 2 테스트 계획의 시나리오가 모두 통과(Playwright MCP 실측 포함).**

**Phase 2 리스크**
- ⚠️ 한글 카테고리/태그 slug 의 URL 인코딩 일관성 — 입력(`Link href`) / 페치(`getPostsByCategory`) / 표시(`category` 비교) 세 지점에서 모두 동일한 정규화 필요. **결정: slug = decoded name (한글 그대로)**. 한 곳 정해 문서화.
- ⚠️ 클라이언트 검색은 `PostSummary` 100건 직렬화를 매 페이지 로드마다 전송 — 글 50건 초과 시 페이지 무게 점검(목표 < 200KB gzipped).

---

### Phase 3 (W3) — 운영 안정화 + 런칭

> **목표**: 시드 글 10편, ISR 검증, on-demand revalidate, Vercel 배포·도메인, 카피 검수.

| ID | 제목 | 담당 | Size | 선행 | 산출물 | DoD | 테스트 | 함정·메모 |
|----|------|------|------|------|--------|-----|--------|----------|
| T3.1 | ISR 갱신 동작 검증 | qa | S | Phase 1, 2 완료 | 수동 시나리오 기록 | Notion 에서 글 1편 발행 → 60초 후 `/posts` 에서 노출 확인. `cacheLife("minutes")` 적용 페이지 모두 점검. | Playwright(네트워크)+수동 | `cacheLife("minutes")` 의 기본 stale 시간(60s)을 PRD와 일치시키되, 필요 시 명시 `cacheLife({ stale: 60, revalidate: 60, expire: 300 })` 로 튜닝. |
| T3.2 | on-demand revalidate webhook 동작 검증 | qa | S | — | curl 호출 스크립트 | `Authorization: Bearer <secret>` 헤더로 POST → 200 응답, 본문에 `revalidated: true`. 잘못된 토큰은 401. | 통합(API) | `app/api/revalidate/route.ts` 는 이미 구현됨 — 실제 호출 + Vercel 로그로 검증. |
| T3.3 | Make/Zapier(또는 수동) 연동 가이드 작성 | ops | S | T3.2 | `docs/REVALIDATE_INTEGRATION.md` (옵션) 또는 README 추가 섹션 | Notion DB 의 Status 변경 시 webhook 호출하는 자동화 레시피 1개. | 수동(체크리스트) | Make/Zapier 무료 플랜 한도 사전 확인. PRD에서는 "선택(권장 Future)" 으로 표기되어 있으나 운영 부담 줄이려면 W3 안에 1회 셋업 권장. |
| T3.4 | Notion 이미지 만료 대응 검증 | qa | S | T1.6 | 시드 글 이미지 1시간 후 재검증 결과 | `next/image` 로 재호스팅된 이미지가 만료 후에도 표시. 만료 후 ISR 재생성 시 Notion에서 새 URL 받아오는 흐름 확인. | Playwright(네트워크/콘솔) | 만료된 URL 캐시 길이가 ISR 주기보다 길면 깨짐 — `cacheLife({ revalidate: 60 })` 정합성 점검. |
| T3.5 | 시드 글 10편 완성 | copy | XL | Phase 2 완료 | Notion DB 에 Published 글 10편 | 카테고리 3종 이상(`AI강의`/`AI도구`/`실험기`)에 골고루 분포. 태그 5종 이상. 각 글 700자 이상. | 수동(체크리스트) | 운영자 병렬 작업. W2 ~ W3 사이에 분산. 초보 톤 일관 유지. |
| T3.6 | Vercel 프로젝트 생성 + 환경변수 등록 | ops | M | T0.3 | Vercel 프로젝트 + Production/Preview 환경변수 | `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_REVALIDATE_SECRET` 3종을 **Production** 에 등록. Preview 환경 별도 토큰 권장. | 수동 | Vercel 환경변수 UI 에서 "Sensitive" 토글. `git push` → 자동 배포 흐름 확인. |
| T3.7 | 카피·디자인 검수 ("초보 톤") | copy/ui | M | T2.7, T2.9, T2.10, T3.5 | 카피 변경 PR | Hero 슬로건, About, Footer, 404, 빈 상태 메시지를 모두 "초보가 쓴 초보 가이드" 톤으로 통일. | 수동(동료 리뷰) | 동료 1명 이상 리뷰 권장 — 운영자 본인 시각 외 검증. |
| T3.8 | 도메인 연결 + HTTPS 검증 | ops | M | T3.6 | 운영 도메인에서 모든 라우트 200 | 정식 도메인(미정) → DNS 설정 → Vercel 도메인 추가 → SSL 자동. `robots.txt`, `sitemap.xml`(선택) 점검. | Playwright(스모크) | 도메인 결정 미정 — W3 초반에 확정. `NEXT_PUBLIC_APP_URL` 도 운영값으로 갱신. |
| T3.9 | Lighthouse / Core Web Vitals 점검 | qa | S | T3.8 | 측정 결과 기록 | 모바일 기준 Performance ≥ 80, Accessibility ≥ 90, SEO ≥ 90. LCP < 2.5s. | Playwright+Lighthouse CLI | 이미지 `next/image` 적용, 폰트 `font/google` 사용 시 `display: "swap"`. |
| T3.10 | 런칭 체크리스트 통과 + 공개 | ops | S | T3.1 ~ T3.9 | "런칭 완료" 기록 (커밋 메시지 또는 docs) | 모든 DoD 충족. SNS/주변에 공유 가능 상태. | 수동(체크리스트) | 런칭 후 24h 내 첫 글 조회수·이탈률 수동 관찰 → Future 의사결정 인풋. |

#### Phase 3 테스트 계획

- **T3.1 ISR 갱신 — Playwright MCP(네트워크) + 수동**
  - 사전: 운영 또는 Preview 배포 환경. 임시 글(`Status=Draft`) 준비.
  - `mcp__playwright__browser_navigate { url: "<deploy>/posts" }` → `mcp__playwright__browser_network_requests` 로 `/posts` 응답 헤더 확인 (`x-vercel-cache` 또는 `x-nextjs-cache` 키 존재).
  - Notion 에서 임시 글 `Status=Published` 로 전환 → 60초 대기 → 같은 URL 재방문 후 `mcp__playwright__browser_snapshot` 에 새 글 카드 존재 확인.
  - 동일 시나리오를 `/category/[slug]`, `/tag/[slug]`, `/` 에서도 1회씩 반복.
- **T3.2 webhook — 통합(API)**
  - 정상: `curl -X POST -H "Authorization: Bearer $SECRET" <deploy>/api/revalidate -d '{"path":"/posts"}'` → `200`, body `{"revalidated":true,...}`.
  - 실패 — 잘못된 토큰: `Bearer wrong` → `401`.
  - 실패 — 헤더 누락: `Authorization` 헤더 없이 호출 → `401`.
  - 실패 — Body 불량: 빈 body 또는 잘못된 JSON → `400` (또는 라우트 정책에 따라 안전 처리).
  - 엣지 — 존재하지 않는 path: `/nope` → `200` 또는 `404` (라우트 결정 후 잠금). Vercel 함수 로그에 에러 없음.
  - 결과는 `scripts/test/revalidate.sh` 또는 `.http` 파일로 저장해 재실행 가능하게 한다.
- **T3.3** (수동 체크리스트): Make/Zapier 시나리오 활성화 후 Notion 에서 글 1편 Published 전환 → webhook 호출 로그 + 60초 이전 노출 확인.
- **T3.4 이미지 만료 — Playwright MCP**
  - 사전: 시드 글에 Notion 업로드 이미지 1장 포함, ISR 재생성 후 약 65분 대기 (이미지 URL 만료 후).
  - `mcp__playwright__browser_navigate { url: "<deploy>/posts/<seed-slug>" }` → 이미지 자연 렌더.
  - `mcp__playwright__browser_network_requests` 에서 이미지 응답이 `200` (4xx 0건).
  - `mcp__playwright__browser_console_messages` 에서 `error` 0건.
  - 추가: T3.2 webhook 으로 강제 revalidate → 이미지 URL이 새 expiry 로 교체되는지 동일 방식 재확인.
- **T3.6** (수동): Vercel 대시보드에서 3종 env Production/Preview 등록 확인, 빌드 로그 성공.
- **T3.7** (수동 동료 리뷰): 체크리스트 - Hero, About, Footer, 404, 빈 상태 메시지 톤 일관성. 동료 1명 사인오프.
- **T3.8 도메인 스모크 — Playwright MCP**
  - `mcp__playwright__browser_navigate` 로 `/`, `/posts`, `/posts/<seed-slug>`, `/category/<sample>`, `/tag/<sample>`, `/about`, 404 경로 각각 1회 방문.
  - `mcp__playwright__browser_network_requests` 에서 HTML 응답 코드가 200(404 페이지만 404).
  - `mcp__playwright__browser_evaluate { function: "() => location.protocol" }` → `"https:"`.
- **T3.9 Lighthouse + Playwright**
  - Lighthouse CLI(`npx lighthouse <deploy>/posts/<seed-slug> --form-factor=mobile --quiet --chrome-flags="--headless"`) 실행 → JSON 리포트.
  - 보조: `mcp__playwright__browser_take_screenshot { filename: "lcp-mobile.png" }` 으로 LCP 시각 자료 첨부.
  - 게이트: Performance ≥ 80, Accessibility ≥ 90, SEO ≥ 90, LCP < 2.5s.
- **T3.10** (수동 체크리스트): Phase 1/2/3 모든 DoD 항목 + 위 테스트 통과 여부를 단일 체크리스트로 점검 후 공개.

**Phase 3 완료 정의(DoD)**
- 운영 도메인에서 `/`, `/posts`, `/posts/[slug]`, `/category/[slug]`, `/tag/[slug]`, `/about` 모두 200.
- Notion 글 발행 → 60초 이내 또는 webhook 즉시 노출 확인.
- 시드 글 10편 + 카테고리 3종 + 태그 5종이 실제 노출.
- Lighthouse(모바일) 성능 ≥ 80, 접근성 ≥ 90.
- **위 Phase 3 테스트 계획의 시나리오가 모두 통과(Playwright MCP 실측 포함). 운영 환경 스모크 + ISR/webhook 시나리오 회귀 통과.**

**Phase 3 리스크**
- ⚠️ Vercel 무료 플랜 함수 호출 한도(100k/월) — webhook 폭주 시 차단 가능. webhook 인증 토큰 누출 주의.
- ⚠️ 도메인 결정 지연 시 T3.8 가 병목 → W3 첫날까지 도메인 결정 필수.

---

## 4. 의존성 그래프

```
Phase 0
└─ T0.1 (Notion DB)
   └─ T0.2 (Integration Token)
      └─ T0.3 (.env.local) ──────┐
T0.4 (server-only) ──────────────┤
                                 │
Phase 1 (W1)                     ▼
T1.1 Client 인스턴스 ◀──── T0.3
   └─ T1.2 getPosts() ◀──────────┐
        ├─ T1.3 getPostBySlug + notion-to-md
        ├─ T1.4 getCategories/getTags
        ├─ T1.5 Slug 중복 검증
        └─ T1.6 PostContent 렌더러 ◀── T1.3
              ├─ T1.7 코드 하이라이트 CSS
              ├─ T1.8 시드 글 2~3편
              └─ T1.9 OG 메타 검증

Phase 2 (W2)
T1.2 ─┬─ T2.1 카테고리 검증
      ├─ T2.2 태그 검증
      ├─ T2.3 홈 검증
      ├─ T2.4 검색바 ─── T2.5 검색 데이터 흐름 결정
      └─ T2.6 추천 3개
T2.7 About / T2.8 Header / T2.9 Footer / T2.10 404 (독립, 병렬 가능)

Phase 3 (W3)
Phase 1,2 완료 ─┬─ T3.1 ISR 검증
                ├─ T3.2 webhook 검증 ─── T3.3 자동화 가이드
                ├─ T3.4 이미지 만료 검증
                └─ T3.5 시드 글 10편
T0.3 ─ T3.6 Vercel 환경변수 ─── T3.8 도메인 ─── T3.9 Lighthouse ─── T3.10 런칭
              ↑ T3.7 카피 검수 (T2.7/T2.9/T2.10/T3.5 의존)
```

**크리티컬 패스**: `T0.1 → T0.2 → T0.3 → T1.1 → T1.2 → T1.3 → T1.6 → T1.8 → T3.5 → T3.6 → T3.8 → T3.10`

---

## 5. 🧪 테스트 전략

> 이 섹션은 prd-roadmap-architect 에이전트 정의 강화(2026-05-17)에 따라 추가되었다.
> 핵심 원칙: **"구현 직후 즉시 테스트, 모든 태스크 DoD 는 정의된 테스트 시나리오 통과를 포함한다."**

### 5.1 전반 원칙

1. **구현 직후 즉시 테스트**: 태스크 단위로 테스트 시나리오를 작성·실행한다. PR/커밋 단위 회귀가 아니라 태스크 단위 자가 검증이 1차 게이트.
2. **다층 테스트**:
   - **데이터/로직 레이어**(`lib/notion.ts`, 매핑/검증/집계): 단위 + 통합. 정상 / 실패 / 엣지 3종 시나리오를 의무화.
   - **API 레이어**(`app/api/revalidate/route.ts` 등 Route Handler): 통합. 인증/Body/메서드/에러 코드를 전부 명시.
   - **UI 레이어**(페이지·인터랙티브 컴포넌트): **Playwright MCP**(`mcp__playwright__*`)로 실제 브라우저 E2E.
   - **운영 레이어**(ISR/webhook/도메인/성능): Playwright MCP + 외부 도구(Lighthouse CLI) 조합.
3. **Playwright MCP 우선**: 별도 `@playwright/test` 러너를 도입하기 전까지 모든 UI E2E 검증은 MCP 함수 호출로 수행. 테스트 결과는 스크린샷·콘솔 로그·네트워크 캡처를 산출물로 남긴다.
4. **러너 부재 대응**: `npm test` 가 미설정이므로 단위/통합 검증은 (a) `npm run build` 가 잡아주는 타입/Suspense 에러, (b) `tsx scripts/test/<name>.ts` 형태의 임시 검증 스크립트, (c) 콘솔 출력 + 수동 어서션 중 적합한 방식을 태스크별로 선택한다.
5. **회귀 방지**: Phase 가 종료될 때마다 직전 Phase 의 핵심 E2E 시나리오를 1회 재실행한다(특히 Phase 2 종료 시 Phase 1 의 T1.6/T1.9, Phase 3 종료 시 Phase 2 의 T2.1/T2.4 회귀).
6. **테스트 데이터 분리**: 시드 글 중 최소 1편은 "회귀 전용"으로 표시(예: Notion 페이지 제목에 `[regression-seed]` 접두). 운영 카피 수정 시 영향 없는 데이터로 유지.
7. **민감 정보 보호**: Playwright 시나리오 스크린샷에 토큰·env 노출 금지. 네트워크 캡처 저장 시 `Authorization` 헤더 마스킹.

### 5.2 Phase별 핵심 테스트 시나리오 매트릭스

| Phase | 핵심 검증 대상 | 단위 | 통합 | Playwright E2E | 수동 |
|-------|---------------|------|------|----------------|------|
| 0 | 환경 변수, `server-only` 가드 | — | T0.4(빌드) | — | T0.1, T0.2, T0.3 |
| 1 | Notion 페치 레이어, 마크다운 렌더링, OG | T1.2, T1.4, T1.5 | T1.1, T1.3 | T1.6, T1.7, T1.9 | T1.8 |
| 2 | 발견성(카테고리/태그/검색/추천/네비) | — | T2.5 | T2.1, T2.2, T2.3, T2.4, T2.6, T2.8, T2.10 | T2.7, T2.9 |
| 3 | ISR, webhook, 이미지 만료, 도메인, 성능 | — | T3.2 | T3.1(네트워크), T3.4, T3.8, T3.9 | T3.3, T3.5, T3.6, T3.7, T3.10 |

### 5.3 Playwright MCP 사용 베이스라인

> 모든 E2E 시나리오는 **로컬 `npm run dev` 또는 Vercel Preview/Production URL** 을 대상으로 실행한다. 시나리오는 짧고 결정적으로(데이터·환경 가정 명시).

표준 실행 흐름:

1. **사전 준비**
   - 로컬 검증: `npm run dev` 로 dev 서버 기동 후 `http://localhost:3000` 대상.
   - 배포 검증(T3.x): Vercel Preview/Production URL 사용.
   - 시드 데이터: 회귀 전용 글 1편이 `Published` 상태인지 사전 확인.
2. **페이지 진입**: `mcp__playwright__browser_navigate { url: "<base>/<path>" }`.
3. **ARIA 트리 스냅샷**: `mcp__playwright__browser_snapshot` → 헤딩/링크/버튼/리전이 기대대로 존재하는지 1차 확인. 셀렉터 없이도 의미 구조를 잡을 수 있다.
4. **인터랙션**:
   - 클릭: `mcp__playwright__browser_click { ref: <snapshot ref>, element: "<설명>" }`.
   - 타이핑: `mcp__playwright__browser_type { ref, text, submit?: true }`.
   - 폼 다건: `mcp__playwright__browser_fill_form { fields: [...] }`.
   - 키보드: `mcp__playwright__browser_press_key { key: "Enter" }`.
5. **상태 확인**:
   - DOM/JS 어서션: `mcp__playwright__browser_evaluate { function: "() => /* boolean·number·string */" }` (간결한 단일 식).
   - 네트워크 검증: `mcp__playwright__browser_network_requests` 또는 단건 `mcp__playwright__browser_network_request` → 응답 코드/헤더(`x-vercel-cache`, `x-nextjs-cache`, `content-type`) 확인.
   - 콘솔 검증: `mcp__playwright__browser_console_messages` → `error`/`warning` 0건 게이트.
6. **시각 회귀**: `mcp__playwright__browser_take_screenshot { filename, fullPage?: true }` → 라이트/다크, 모바일/데스크톱 사이즈별로 저장. 파일명 컨벤션 `t<phase>-<task>-<variant>.png`.
7. **반응형 검증**: `mcp__playwright__browser_resize { width, height }` 로 모바일(375×812) ↔ 데스크톱(1280×800) 전환 후 재스냅샷.
8. **정리**: 작업 후 다른 시나리오에 영향이 갈 수 있으면 `mcp__playwright__browser_close`. 시드 데이터 변경(예: Draft 토글) 시 반드시 원복.

자주 쓰는 어서션 패턴 예시:

```text
# 카드 수
mcp__playwright__browser_evaluate { function: "() => document.querySelectorAll('[data-testid=\"post-card\"]').length" }

# 다크모드 적용
mcp__playwright__browser_evaluate { function: "() => document.documentElement.classList.contains('dark')" }

# 이미지 4xx 0건
mcp__playwright__browser_network_requests
→ 응답 중 contentType 이미지 + status >= 400 필터링 후 길이 0
```

`data-testid` 가 없으면 우선 ARIA 셀렉터(역할·이름)로 충분히 잡을 수 있다. UI 컴포넌트에 안정적 셀렉터가 필요하면 PR 시 `data-testid` 를 함께 추가한다.

---

## 6. 리스크 & 대응

| # | 리스크 | 영향 | 가능성 | 대응 |
|---|--------|------|--------|------|
| R1 | Notion 일부 블록(synced block, 복잡한 embed) 변환 한계 (PRD 단점) | 본문 일부 누락 | 중 | 시드 글 작성 시 사용 가능한 블록 화이트리스트 운영자 가이드 작성. 미지원 블록은 코드/이미지로 대체. |
| R2 | 초기 글 수 부족 → 검색 결과 빈약 → 이탈 (PRD 불만족 가설) | 첫 인상 악화 | 중 | T3.5 시드 글 10편 + 카테고리/태그 칩으로 발견성 강화. 빈 검색 결과에 "전체 글 보기" 폴백 CTA. |
| R3 | Notion 이미지 1시간 만료 → 캐시 만료 후 이미지 깨짐 | 본문 가독성 | 중 | `next/image` 재호스팅 + ISR 60초 정합성 검증(T3.4). 만료 검출 시 백오피스 알림은 Future. |
| R4 | `cacheComponents: true` 환경에서 페치 위치 실수 → 빌드 실패 | 빌드 중단 | 높 | 모든 동적 라우트는 `app/posts/[slug]/page.tsx` 패턴(정적 셸 + `<Suspense>` 안 데이터 컴포넌트)을 복제. 코드 리뷰 체크리스트에 추가. |
| R5 | shadcn/ui (`@base-ui/react`) 와 기존 Radix 기반 자료 충돌 | 폼/검색 UI 구현 지연 | 중 | 새 UI 도입 전 `components/ui/*.tsx` 실제 props 확인. `npx shadcn@latest add` 로만 추가. |
| R6 | NOTION_TOKEN 클라이언트 번들 노출 | 보안 사고 | 낮(가드 있음) | T0.4 `server-only` import + 코드 리뷰 시 클라이언트 컴포넌트의 `lib/notion` import 금지. |
| R7 | Vercel 빌드 시간 초과 (글 수 증가) | 배포 지연 | 낮 | ISR 사용으로 빌드 시 SSG 부담 낮음. 글 100건 초과 시 build 시 prebuild 글 수 제한 검토. |
| R8 | 도메인 미확정으로 W3 후반 일정 압박 | 런칭 지연 | 중 | W3 1일차(2026-05-31) 까지 도메인 결정. 임시 `*.vercel.app` 으로 우선 공개도 옵션. |

---

## 7. Future Work 우선순위

PRD Future 항목을 **사용자 가치(임팩트) × 구현 비용(노력)** 으로 점수화. 점수 = 임팩트(1~5) - 노력(1~5)(높을수록 우선).

| 우선순위 | 항목 | 임팩트 | 노력 | 점수 | 트리거 조건 | 비고 |
|---------|------|--------|------|------|------------|------|
| 1 | **RSS / Atom 피드** | 4 | 1 | +3 | 런칭 직후 (구독자 확보) | `app/feed.xml/route.ts` 1파일로 가능. SEO·구독성 동시 확보. |
| 2 | **OG 이미지 자동 생성** | 4 | 2 | +2 | SNS 유입 시도 시점 | `@vercel/og` 활용. 글별 동적 OG. |
| 3 | **댓글 (Giscus)** | 4 | 2 | +2 | 글 20편 이상 + 첫 독자 피드백 도착 시점 | GitHub Discussions 기반. 무료. |
| 4 | **조회수·좋아요 (Vercel KV)** | 3 | 2 | +1 | "어떤 글이 끝까지 읽히는가" 데이터 필요 시점 | 만족 가설 검증 도구. Vercel KV 또는 Upstash. |
| 5 | **시리즈/강의 그룹** | 4 | 3 | +1 | 연재성 글 3편 이상 묶일 때 | Notion DB 에 `Series` select 추가. 새 라우트 `/series/[slug]`. |
| 6 | **뉴스레터 구독** | 3 | 3 | 0 | 정기 독자 50명 이상 확보 시 | Buttondown/Substack 임베드부터 시작 권장. |
| 7 | **서버사이드 검색 (Algolia/Meilisearch)** | 3 | 4 | -1 | 글 100편 초과 시 자동 트리거 | T2.5 결정 재검토 신호. 비용 발생. |
| 8 | **다국어 지원** | 3 | 5 | -2 | 해외 트래픽 검증된 후 | next-intl 도입. 콘텐츠 번역 운영비용 큼. |

---

## 8. 참고 링크

- [`docs/NOTION_BLOG_PRD.md`](./NOTION_BLOG_PRD.md) — 단일 출처(SSOT). 우선순위/기능 명세/DataTable.
- [`CLAUDE.md`](../CLAUDE.md) — Next.js 16·Cache Components·shadcn(`@base-ui/react`) 규칙, 명령어, 함정 노트.
- [`AGENTS.md`](../AGENTS.md) — "This is NOT the Next.js you know" 경고 + 새 API 학습 시 `node_modules/next/dist/docs/` 참조.
- [`README.md`](../README.md) — 외부 독자용 프로젝트 소개.
- [`docs/HOOKS_PLANNING.md`](./HOOKS_PLANNING.md) — Slack 알림·Claude Hook 시스템 (운영 자동화 관련).
- [`BUG_REPORT.md`](../BUG_REPORT.md) — 스타터킷 시절 이슈 (신규 이슈는 append 권장).
- [`.env.example`](../.env.example) — 환경변수 템플릿.

---

## 9. 변경 이력

| 날짜 | 작성자 | 변경 내용 |
|------|--------|----------|
| 2026-05-17 | prd-roadmap-architect | 초기 로드맵 작성 (W1~W3, 총 32 태스크). PRD v1(2026-05-16) 기반. |
| 2026-05-17 | prd-roadmap-architect | 테스트 전략 섹션 및 태스크별 테스트 계획 추가 (Playwright MCP 베이스라인 정립). |
