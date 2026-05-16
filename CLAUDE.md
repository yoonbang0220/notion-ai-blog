# CLAUDE.md

이 저장소에서 Claude Code(claude.ai/code)가 작업할 때 따라야 할 지침이다.

@AGENTS.md

## 언어 규칙

- **응답·주석·커밋 메시지·문서**: 한국어
- **변수명·함수명**: 영어 (코드 표준 준수)

## 명령어

```bash
npm run dev      # 개발 서버 (Next.js 16 / Turbopack 기본)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # ESLint (package.json은 `eslint`만 — 인자 없이 전체 검사)
npx prettier --write .            # 전체 포맷팅 (`format` npm 스크립트 없음 → npx 직접 호출)
npx shadcn@latest add <component> # shadcn/ui 컴포넌트 추가
```

테스트 러너·pre-commit hook 모두 미설정. 대신 **UI/사용자 흐름 검증은 Playwright MCP**(`mcp__playwright__*`)로 수행한다 — 자세한 정책은 아래 "테스트 정책" 절 참고.

## 프로젝트 정체성

이 저장소는 **Notion CMS 기반 AI 학습 블로그 MVP** 다. 단일 출처: `docs/NOTION_BLOG_PRD.md`. 실행 계획: `docs/ROADMAP.md`.
스타터킷 시절의 로그인/회원가입/대시보드는 모두 제거되었고, 페이지·컴포넌트·타입은 블로그 도메인에 맞춰 정리됐다.

**Goal**: AI 초보자가 글 1편을 끝까지 정독하고 "나도 따라할 수 있겠다"는 자신감을 느끼게 한다.
**타겟 페르소나**: 28세 마케터 "김지원"(비개발자). 카피·예시·설명 톤은 항상 **"초보가 쓴 초보 가이드"** 기준으로 점검한다. 전문 용어 남발 금지.

**MVP 범위 (P0 — 빠지면 안 됨)**: 홈 / 글 목록 / 글 상세 / 카테고리 필터 / 태그 필터 / 클라이언트 사이드 검색 / Notion 페치 파이프라인 / on-demand revalidate webhook.
**Future (지금 만들지 말 것)**: 댓글(Giscus), RSS/Atom, 시리즈/강의 그룹, 다국어, 뉴스레터, 조회수·좋아요(Vercel KV), OG 이미지 자동 생성, 서버사이드 검색(Algolia/Meilisearch). 우선순위·트리거 조건은 `docs/ROADMAP.md` 7절 참고.

**진행 상태 / 일정** (PRD·ROADMAP 기준):
- 일정: 파트타임 3주 — W1 (2026-05-17~05-23) / W2 (~05-30) / W3 (~06-06).
- 현재: 페이지 셸·타입·환경변수 템플릿·revalidate route는 완성. **`lib/notion.ts` 본문 구현이 다음 차례(W1 크리티컬 패스)**.
- 크리티컬 패스: `T0.1 → T0.2 → T0.3 → T1.1 → T1.2 → T1.3 → T1.6 → T1.8 → T3.5 → T3.6 → T3.8 → T3.10`. 작업 전 ROADMAP에서 해당 태스크 ID 섹션을 확인할 것.

## 도메인 모델 (Notion DB)

Notion에 `Posts` Database 1개를 운영자가 직접 만든다. 속성 9종은 다음과 같으며 `types/index.ts`의 `Post` / `PostSummary` / `Category` / `Tag` 인터페이스와 1:1 매핑된다.

| Notion 속성 | 타입 | TS 필드 | 비고 |
|------------|------|---------|------|
| `Title` | title | `title` | Notion `title` 속성. `rich_text` 배열 → `plain_text` join 필요 |
| `Slug` | text (unique) | `slug` | URL 경로. **중복 시 빌드 실패** |
| `Status` | select (`Draft` / `Published`) | (필터) | `Published`만 노출 |
| `Category` | select | `category` | 단일. 예: `AI강의`, `AI도구`, `실험기` |
| `Tags` | multi-select | `tags: string[]` | 예: `GPT`, `Python`, `입문` |
| `Summary` | text | `summary` | 카드 본문 + meta description |
| `Cover` | file / url | `coverUrl: string \| null` | `file.expiry_time` **1시간 만료** → `next/image` 재호스팅 |
| `PublishedAt` | date | `publishedAt` (ISO 8601) | 정렬·표시 |
| (페이지 본문) | blocks | `content` (markdown) | `notion-to-md` 변환 |

**정합성 규칙 (코드에 반드시 반영)**
1. **Slug 중복** → `getPosts()` 내부에서 검출 시 `throw new Error("Duplicate slug: <slug>")`. 빌드가 즉시 실패해야 한다.
2. **필수 속성 누락** (`Title` / `Slug` / `Status` / `Category` 중 하나라도) → `console.warn` 1회 후 결과 배열에서 **스킵**. throw 금지(글 1편 때문에 전체 빌드 깨지면 안 됨).
3. **slug 정규화 정책 = decoded name (한글 그대로)**. `Link href`, 페치 비교(`p.category === slug`), 표시 세 지점 모두 동일 키 사용. URL 인코딩은 브라우저에 위임.
4. **이미지** — Notion `file.url`은 1시간 후 만료되므로 `<img>` 직접 사용 금지. 반드시 `next/image`로 래핑해 Vercel이 재호스팅.

**검색 범위 가정**: 글 ≤100건 → 클라이언트 사이드 `includes` 매칭(대소문자 무시). `PostSummary[]`를 SSR 페이지에서 클라이언트 컴포넌트로 prop 전달. 별도 API 라우트·`fuse.js` 도입 금지(Future). 50건 초과 시 페이지 무게 점검(<200KB gzipped).

**회귀 검증용 시드 글**: 최소 1편은 Notion 페이지 제목에 `[regression-seed]` 접두를 붙여 카피 수정 시 영향 없도록 유지. Playwright 시나리오는 이 시드를 우선 사용.

## 기술 스택 & ⚠️ 함정 노트

- **Next.js 16.2.6** (App Router)
  - `params` / `searchParams`는 **`Promise` 타입** → 반드시 `await`.
  - `next.config.ts`에서 `cacheComponents: true` 활성화 → 서버 컴포넌트 내 비동기 함수에 `"use cache"` 지시자 사용 가능.
  - **동적 라우트(`[slug]`)에서 `params`를 await 한 뒤 데이터를 페치하는 부분은 반드시 `<Suspense>` 안에 둬야 빌드가 통과한다** (Cache Components 의 prerender 규칙). 패턴은 `app/posts/[slug]/page.tsx` 참고.
  - ISR 60초 같은 `revalidate` 의도는 `"use cache"` + `cacheLife("minutes")` 로 표현한다(`revalidate` export 대신).
  - `middleware.ts`는 지원되나 향후 `proxy.ts`로 마이그레이션될 수 있음.
- **React 19.2.4**
- **TypeScript 5** (`strict: true`)
- **Tailwind CSS v4** — `tailwind.config.ts` 없음. 토큰은 `app/globals.css`의 `@theme inline` 블록에서 정의. `@import "shadcn/tailwind.css"` 포함.
- **shadcn/ui (`base-nova` 스타일)** — ⚠️ **Radix UI가 아닌 `@base-ui/react` 기반.** 컴포넌트 API가 기존 shadcn과 다르므로 props는 항상 실제 파일에서 확인. 폼 빌딩은 `field.tsx`(Field/FieldLabel/FieldGroup 등) + `separator.tsx` 조합을 사용한다.
- **next-themes** — `ThemeProvider`, 루트 `<html>`에 `suppressHydrationWarning` 필수.
- **sonner** — `<Toaster>`는 루트 레이아웃(`app/layout.tsx`)에 이미 포함됨. 페이지별 재선언 금지.
- **lucide-react** — 아이콘.
- **Notion CMS 파이프라인** — `@notionhq/client` + `notion-to-md` (페치/변환), `react-markdown` + `remark-gfm` + `rehype-highlight` (렌더링). 토큰은 서버 전용(`NOTION_TOKEN`/`NOTION_DATABASE_ID`). `NEXT_PUBLIC_` 절대 금지.

## 아키텍처

```
app/                  # 페이지·레이아웃 (App Router)
  page.tsx            # 홈 (Hero + 카테고리 칩 + 최신 글 6개)
  posts/page.tsx              # 전체 글 목록
  posts/[slug]/page.tsx       # 글 상세 (PPR: 셸 static + 데이터 streamed)
  category/[slug]/page.tsx    # 카테고리별 목록
  tag/[slug]/page.tsx         # 태그별 목록
  about/page.tsx              # 운영자 소개
  api/revalidate/route.ts     # Notion 외부 자동화 webhook (Bearer 인증)
components/
  ui/                 # shadcn/ui 컴포넌트 (직접 수정 최소화)
                      #   현재: button, card, field, input, label, separator, sonner
  common/             # 프로젝트 공통 (Header, Footer, ThemeProvider, ThemeToggle)
lib/
  utils.ts            # cn() — clsx + tailwind-merge
  notion.ts           # Notion CMS 페치 레이어 (서버 전용, 시그니처만 존재)
types/index.ts        # 블로그 도메인 타입 (Post, PostSummary, Category, Tag, ThemeMode)
```

> **폼 컴포넌트 분리 패턴** — 페이지 폼·복잡한 인터랙티브 블록은 `components/<feature>-form.tsx` 로 분리한다(예: 향후 검색바, 뉴스레터 등). `app/.../page.tsx` 는 얇은 서버 컴포넌트 래퍼로 유지.

**레이아웃 계층**
```
RootLayout (ThemeProvider · Header · main · Footer · Toaster)
```

단일 루트 레이아웃만 사용. 별도 그룹 레이아웃은 없다.

**페이지 현황**: 구현 — `/`, `/posts`, `/posts/[slug]`, `/category/[slug]`, `/tag/[slug]`, `/about`, `not-found`. Route Handler — `/api/revalidate`. 모든 페이지는 빈 Notion 응답을 안전히 처리하도록 작성되어 있으며, 실제 콘텐츠는 `lib/notion.ts` 구현 후 자동 표시된다.

## 주요 패턴

- **컴포넌트 변형** — `class-variance-authority`(CVA)로 `variant`/`size`. `components/ui/button.tsx`가 레퍼런스. `@base-ui/react` primitive를 감싸며 `ButtonPrimitive.Props`를 확장한다.
- **className 병합** — 무조건 `cn()`. Tailwind 충돌 해결.
- **클라이언트 컴포넌트** — 브라우저 API·훅이 필요할 때만 `"use client"`. 현재 클라이언트 컴포넌트는 `ThemeProvider`, `ThemeToggle`, `Toaster`, `Field`/`Separator`(@base-ui/react primitive) 정도뿐.
- **Cache Components / ISR** — `"use cache"` + `cacheLife("minutes")` 패턴으로 ISR을 표현한다. `lib/notion.ts` 모듈 자체에는 캐시 지시자를 두지 않고, 호출부(페이지)에서 캐시 범위를 지정한다.
- **동적 라우트 + Suspense** — `[slug]` 라우트는 "정적 셸 + Suspense 안의 데이터 컴포넌트" 구조로 작성한다. 그렇지 않으면 `Uncached data was accessed outside of <Suspense>` 빌드 에러가 난다.
- **Notion 페치 레이어** — `lib/notion.ts` 는 서버 전용. `NOTION_TOKEN` 노출 위험이 있으므로 클라이언트 컴포넌트에서 직접 import 금지.

## 테스트 정책

전통적 러너는 없지만 작업 유형별로 다음 검증을 **DoD의 일부로** 요구한다(상세는 `docs/ROADMAP.md` 5절 "🧪 테스트 전략" 참고).

- **API 연동 / 비즈니스 로직** (`lib/notion.ts`, `app/api/*/route.ts`, 데이터 변환·권한·캐시 무효화) — 정상 흐름 + 실패/에러 경로(401·외부 API 에러·빈 응답·타임아웃) + 엣지 케이스(경계값·중복 slug 등) **최소 3종 시나리오** 명시.
- **UI / 사용자 인터랙션 / 페이지 흐름** — **Playwright MCP**로 E2E 실측. 주요 호출:
  - `mcp__playwright__browser_navigate` — 페이지 이동
  - `mcp__playwright__browser_snapshot` — ARIA 트리 기반 상태 확인 (셀렉터보다 우선)
  - `mcp__playwright__browser_click` / `browser_fill_form` / `browser_type` — 인터랙션
  - `mcp__playwright__browser_network_request` — Route Handler·API 응답 검증
  - `mcp__playwright__browser_take_screenshot` — 다크모드·시각 회귀
  - `mcp__playwright__browser_console_messages` — 클라이언트 에러 감지
- **회귀 방지** — 버그 수정 시 해당 버그를 재현하는 테스트를 먼저 작성한 뒤 수정한다.

> 신규 로드맵·기능을 짤 때는 `prd-roadmap-architect` 서브에이전트를 사용한다. 이 에이전트는 모든 작업 항목에 위 정책에 맞춘 "테스트 계획" 블록을 자동으로 포함시킨다.

## 스타일링

- 색상 토큰: `app/globals.css`의 CSS 변수(`--background`, `--primary` 등). **oklch** 색공간.
- 다크모드: `.dark` 클래스 토글 — `@custom-variant dark (&:is(.dark *))`.
- 테마 색 변경 → `globals.css`의 `:root` / `.dark` 블록.
- 클래스 정렬: `prettier-plugin-tailwindcss` 자동.

## 환경 변수 & 경로

- `.env.local`에 실제 값 (`.env.example` 참고). 클라이언트 노출 변수는 `NEXT_PUBLIC_` 접두사 필수.
- 경로 alias: `@/*` → 프로젝트 루트 (`tsconfig.json`).

## 프로젝트 컨텍스트 문서

- `docs/NOTION_BLOG_PRD.md` — **단일 출처(SSOT)**. Overview / Persona / Use Cases / 기능 명세서(P0·P1·Future) / IA / DataTable / 기술 결정 / 정합성 규칙. 새 기능 추가·범위 결정 전 반드시 참고.
- `docs/ROADMAP.md` — W1~W3 32개 태스크 실행 계획(`T<주차>.<번호>` ID 컨벤션). 각 태스크의 산출물·DoD·**테스트 계획**·의존성·리스크. 작업 시작 전 해당 태스크 ID 섹션을 우선 확인. 테스트 베이스라인은 5절 "🧪 테스트 전략", 리스크 R1~R8은 6절, Future 우선순위 매트릭스는 7절.
- `BUG_REPORT.md` — 스타터킷 시절 누적된 이슈 기록. 블로그 MVP와 무관한 항목이 다수이므로 신규 이슈만 append 권장.
- `README.md` — 외부 독자용 프로젝트 소개.

## Claude Code 통합 환경

저장소 동봉 자산:

- `.claude/agents/` — 서브에이전트 정의. 현재 6종:
  - `code-reviewer-kr` — 코드 구현 완료 시 자동 호출 권장. 한국어 리뷰.
  - `qa-engineer` — TC 설계·테스트 작성·버그 분석.
  - `reverse-planner` — 코드 작성 후 역기획서 자동 생성.
  - `prd-generator` — MVP PRD 문서 작성.
  - `prd-roadmap-architect` — PRD → `docs/ROADMAP.md` 변환. 각 작업에 테스트 계획(Playwright MCP 포함) 자동 포함.
  - `nextjs-starter-optimizer` — 스타터킷 정리·최적화 (현재 단계에서는 거의 사용 불필요).
- `.claude/agent-memory/<agent>/` — 서브에이전트별 메모리 저장소.
- `.claude/commands/git/` — 커스텀 슬래시 명령 (`/git:commit`, `/git:explain`).
- `.claude/output-styles/beginner.md` — 초보자용 출력 스타일.
- `.claude/settings.json` — 프로젝트 공유 Hook 설정 (현재 Bash PreToolUse 테스트 훅 → `hook-test.txt`에 로그 append).
- `.claude/slack-notify.ps1` — Windows PowerShell. 권한 요청 / 작업 완료 / 서브에이전트 이벤트를 Slack에 전달. UTF-8 BOM 인코딩 사용(한글 깨짐 방지).
- `.claude/statusline-command.sh` / `.claude/statusline-command.ps1` — 크로스플랫폼 statusline 스크립트(macOS·Linux / Windows). 대화 컨텍스트 기반으로 하단 상태바를 그린다. **statusline 동작 수정 시 두 파일을 동시에 맞춰야 함**.
- `.mcp.json` — MCP 서버 설정. 등록 서버:
  - `context7` — 라이브러리 문서 조회 (Next.js·Tailwind 등 최신 API 확인 시 우선 사용).
  - `sequential-thinking` — 단계적 사고.
  - `playwright` — 브라우저 자동화. **테스트 정책의 E2E 검증 기본 도구**.
  - `shadcn` — shadcn/ui 레지스트리 검색·추가.
  - `task-master-ai` — 태스크 분해·추적.
- `docs/HOOKS_PLANNING.md` — Slack 알림 시스템 설계·이슈·로드맵 기획서. **Slack/Hook 관련 변경 시 반드시 참조**.
- `hook-test.txt` (저장소 루트) — Bash PreToolUse 훅이 append하는 로그. 수동 편집 금지.

`.claude/settings.local.json`은 `.gitignore` 처리. Claude Code가 자동 추가하는 permission 룰에 webhook URL 같은 민감값이 섞일 수 있어 의도적으로 untrack.
