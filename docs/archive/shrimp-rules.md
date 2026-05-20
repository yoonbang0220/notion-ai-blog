# Development Guidelines — Notion CMS AI 학습 블로그

> 이 문서는 Coding Agent(Claude Code 등) **전용 운영 룰북**이다. 일반 개발자 가이드가 아니다.
> 일반 지식·튜토리얼은 절대 적지 않는다. **이 저장소만의 제약·계약·금지사항·다중 파일 동기화 규칙**만 담는다.
> SSOT: `docs/NOTION_BLOG_PRD.md`. 실행 계획: `docs/ROADMAP.md`. 본 문서와 충돌하면 SSOT가 우선이며, **본 문서를 즉시 갱신**한다.

---

## 1. 프로젝트 개요 (참조용 — 결정 기준이 될 때만 사용)

- 정체성: **Notion CMS 기반 AI 학습 블로그 MVP**. 운영자가 Notion DB에 글을 쓰고 `Status=Published`로 바꾸면 ISR로 자동 노출.
- 타겟 페르소나: 비개발자 입문자 "김지원". 카피·예시·설명은 항상 **"초보가 쓴 초보 가이드"** 톤으로 점검.
- 현재 단계: W1 (2026-05-17~05-23). **`lib/notion.ts` 본문이 다음 크리티컬 패스**. 페이지 셸·타입·환경변수 템플릿은 완성.
- 기술 스택 핀: Next.js 16.2.6 + React 19.2.4 + TS 5(strict) + Tailwind v4 + shadcn/ui(base-nova, `@base-ui/react`) + Notion 공식 클라이언트.

---

## 2. 프로젝트 아키텍처 (수정 시 참조해야 할 디렉터리)

```
app/                       페이지·라우트 (App Router)
  page.tsx                 홈
  posts/page.tsx           전체 글 목록 + 검색
  posts/[slug]/page.tsx    글 상세 (★ Suspense 패턴 표준)
  category/[slug]/page.tsx 카테고리 목록
  tag/[slug]/page.tsx      태그 목록
  about/page.tsx           운영자 소개
  api/revalidate/route.ts  on-demand revalidate webhook
  layout.tsx               단일 루트 레이아웃 — ThemeProvider + Header + Footer + Toaster
  globals.css              Tailwind v4 토큰·다크모드 변수 (★ 단일 출처)
components/
  ui/                      shadcn/ui (base-nova) — 직접 수정 최소화
  common/                  Header / Footer / ThemeProvider / ThemeToggle
lib/
  notion.ts                Notion 페치 레이어 (★ 서버 전용, 클라이언트 import 금지)
  utils.ts                 cn() 만 존재
types/index.ts             블로그 도메인 타입 (Post / PostSummary / Category / Tag / PostStatus / ThemeMode)
docs/
  NOTION_BLOG_PRD.md       SSOT
  ROADMAP.md               태스크 ID(T<주차>.<번호>)와 DoD·테스트 계획
  HOOKS_PLANNING.md        Slack 알림·Hook 설계
```

신규 디렉터리 추가가 필요하면 **위 표를 같은 PR에서 갱신**한다.

---

## 3. 코드 표준

### 3.1 언어
- **응답·주석·커밋 메시지·문서**: 한국어 강제.
- **변수·함수·파일명**: 영어. `camelCase`(변수/함수), `PascalCase`(컴포넌트·타입), `kebab-case`(라우트 폴더·`-form.tsx` 파일).
- 한국어 정체성 용어가 식별자에 들어가야 하는 경우(예: 카테고리 `AI강의`)는 **데이터 값으로만** 허용. 코드 식별자에는 금지.

### 3.2 포맷
- 포맷터: `prettier` (+ `prettier-plugin-tailwindcss`). `npx prettier --write .`. **`format` npm 스크립트 없음 → npx 직접 호출**.
- 린트: `npm run lint` (인자 없음, 전체 검사).
- 들여쓰기/세미콜론 등은 `.prettierrc`에 위임. 수동 조정 금지.

### 3.3 주석
- 코드가 무엇을 하는지(WHAT)는 적지 않는다. **WHY가 비자명할 때만** 1줄 주석.
- TODO 주석은 `// TODO(T<주차>.<번호>): ...` 또는 `// TODO(W<주차>): ...` 형식 — ROADMAP과 추적되게.

### 3.4 import 경로
- 절대경로 alias는 **`@/`** 한 가지. 상대경로 `../../` 2단 이상 금지 → `@/`로 대체.
- `lib/notion.ts`는 **클라이언트 컴포넌트(`"use client"` 파일)에서 import 금지**. `server-only` 가드 추가 시 첫 줄에 `import "server-only"`.

---

## 4. 기능 구현 표준

### 4.1 Notion 페치 레이어 (`lib/notion.ts`)
- 공개 시그니처는 다음 4개로 **고정**. 추가/변경 시 `types/index.ts`와 `docs/NOTION_BLOG_PRD.md` DataTable을 같은 커밋에서 갱신:
  - `getPosts(): Promise<PostSummary[]>`
  - `getPostBySlug(slug: string): Promise<Post | null>`
  - `getCategories(): Promise<Category[]>`
  - `getTags(): Promise<Tag[]>`
- **Slug 중복** 검출 시 `throw new Error("Duplicate slug: <slug>")` — 빌드를 깨뜨려야 한다.
- **필수 속성 누락**(`Title` / `Slug` / `Status` / `Category` 중 하나라도) → `console.warn` 1회 후 **결과 배열에서 스킵**. throw 금지.
- **slug 정규화 = decoded name(한글 그대로)**. `Link href`, 페치 비교(`p.category === slug`), 표시 — 세 지점 모두 동일 키. URL 인코딩은 브라우저에 위임.
- 모듈 자체에 `"use cache"` 지시자 금지. **호출부(페이지/route)** 에서 캐시 범위를 정한다.
- 캐시 패턴 표준:
  ```tsx
  async function getCachedPosts() {
    "use cache"
    cacheLife("minutes")
    return getPosts()
  }
  ```
- 한 호출부 안에서 `getPosts()`를 두 번 부르지 않는다. 결과를 변수에 담아 재사용.

### 4.2 페이지 라우트 패턴
- **`params` / `searchParams` 는 `Promise` 타입** → 반드시 `await`. 타입은 `type Params = Promise<{ slug: string }>`.
- **동적 라우트(`[slug]`)** 는 다음 구조를 따른다 — 어기면 `Uncached data was accessed outside of <Suspense>` 빌드 에러 발생:
  ```tsx
  export default function Page({ params }: { params: Params }) {
    return (
      <Suspense fallback={<Skeleton />}>
        <Content params={params} />
      </Suspense>
    )
  }
  async function Content({ params }: { params: Params }) {
    const { slug } = await params
    const data = await getCached(slug)
    if (!data) notFound()
    /* ... */
  }
  ```
  레퍼런스: `app/posts/[slug]/page.tsx`. 새 동적 라우트 작성 시 이 파일을 복사 시작점으로 사용.
- ISR 의도는 `"use cache"` + `cacheLife("minutes")` 로 표현. **`export const revalidate = N` 사용 금지**.
- `generateMetadata`도 같은 캐시 함수를 호출해 dedup.

### 4.3 이미지
- Notion `file.url`은 **1시간 후 만료**. `<img>` 직접 사용 금지.
- **반드시 `next/image`** 로 래핑. 마크다운 본문 이미지도 `react-markdown`의 `components.img` 오버라이드로 `next/image` 교체.

### 4.4 마크다운 렌더
- 라이브러리 조합 고정: `react-markdown` + `remark-gfm` + `rehype-highlight`.
- 코드 하이라이트 CSS는 `app/globals.css` 에서 `@import "highlight.js/styles/github.css"`(라이트) + `(prefers-color-scheme: dark)`(다크)로 분기. 별도 CSS 파일 신설 금지.
- 본문 컴포넌트는 서버 컴포넌트로 작성(`"use client"` 금지) — `app/posts/[slug]/page.tsx` 의 `<PostContent>` 영역을 교체하는 형태.

### 4.5 검색
- 글 ≤100건 가정 → **클라이언트 사이드 `includes` 매칭**(대소문자 무시).
- `PostSummary[]`를 SSR 페이지에서 클라이언트 컴포넌트로 prop 전달.
- **금지**: 별도 API 라우트 신설, `fuse.js`/Algolia/Meilisearch 도입(전부 Future). 50건 초과 시 페이지 무게 점검(<200KB gzipped).

### 4.6 revalidate webhook
- `app/api/revalidate/route.ts`만 사용. 추가 엔드포인트 금지.
- 인증은 `Authorization: Bearer ${NOTION_REVALIDATE_SECRET}` 헤더 비교 — 401 응답 형식 유지.
- 환경변수 `NOTION_REVALIDATE_SECRET` 누락 시 500 응답을 유지(현재 동작).

### 4.7 폼 / 인터랙티브 블록 분리
- 페이지 폼·복잡한 인터랙티브 영역은 **`components/<feature>-form.tsx`** 로 분리.
- `app/.../page.tsx`는 얇은 서버 컴포넌트 래퍼만. 직접 `useState`/`onClick` 작성 금지.

### 4.8 Toaster / ThemeProvider
- **루트 `app/layout.tsx`에 이미 포함됨**. 페이지·레이아웃에서 재선언 금지.
- 토스트는 `import { toast } from "sonner"`로 호출만 한다.

---

## 5. 외부 라이브러리 사용 표준

### 5.1 Next.js 16 (App Router, `cacheComponents: true`)
- **금지**: `export const revalidate`, `export const dynamic = "force-static"`(필요 시 캐시 함수로 표현), `params`를 await 없이 사용.
- `next.config.ts` 에서 `cacheComponents: true` **유지**. 끄지 말 것.
- 라이브러리·API 변경이 의심되면 **`node_modules/next/dist/docs/`** 의 가이드를 먼저 읽는다(AGENTS.md 규칙). 그래도 불확실하면 `context7` MCP로 공식 문서 조회 후 작업.

### 5.2 shadcn/ui (base-nova) + `@base-ui/react`
- 컴포넌트 추가는 **`npx shadcn@latest add <component>`** 만 사용. 수동 작성 금지.
- **Radix 기반이 아니다.** `@radix-ui/*` 패키지 신규 import 금지.
- 컴포넌트 API는 항상 `components/ui/<name>.tsx` 실제 파일에서 확인. 외부 튜토리얼 기억 신뢰 금지.
- 폼 빌딩 표준 조합: `field.tsx`(Field/FieldLabel/FieldGroup) + `separator.tsx`.
- 클래스 합성은 무조건 **`cn()` from `@/lib/utils`**. raw 문자열 결합 금지.
- variant는 **CVA**(`class-variance-authority`)로 정의. 인라인 분기 금지. 레퍼런스: `components/ui/button.tsx`.

### 5.3 Tailwind v4
- **`tailwind.config.ts` 없음.** 신설 금지.
- 색·반경·spacing 토큰 추가는 **`app/globals.css`의 `@theme inline` 블록**에서. 다른 파일 신설 금지.
- 다크모드는 `.dark` 클래스 + `@custom-variant dark (&:is(.dark *))`. 별도 다크 토큰 파일 만들지 말 것.

### 5.4 next-themes
- `<html>` 에 **`suppressHydrationWarning` 필수**(현재 `app/layout.tsx` 유지).
- `ThemeProvider` 옵션 변경 시 `components/common/ThemeToggle.tsx` 와 일관성 확인.

### 5.5 sonner / lucide-react
- Toaster 1개만 유지(루트 레이아웃). 페이지별 재배치 금지.
- 아이콘은 **lucide-react만** 사용. 다른 아이콘 라이브러리 도입 금지.

### 5.6 Notion 클라이언트
- **`@notionhq/client`만** 사용. 비공식 API/scraper 금지(PRD).
- `notion-to-md` 외의 변환기 추가 금지.
- 응답 union type narrowing 위해 내부 가드(`isFullPage`) 사용. `as any` 금지.

### 5.7 신규 라이브러리 도입 결정 트리
1. PRD/ROADMAP에 명시되어 있는가? → 예: 진행. 아니오: 2.
2. MVP P0/P1 범위에 필요한가? → 아니오: **Future로 분리하고 도입하지 않음**.
3. 예: PR 본문에 (a) 대체 가능한 기존 의존성 부재 (b) 번들 사이즈 영향 (c) Vercel 한도 영향을 적고 도입.

---

## 6. 워크플로 표준

### 6.1 작업 시작 전 필수 확인
- **`docs/ROADMAP.md`에서 해당 태스크 ID(T<주차>.<번호>) 섹션**을 읽고 DoD·테스트 계획·의존성·리스크를 확인.
- 크리티컬 패스: `T0.1 → T0.2 → T0.3 → T1.1 → T1.2 → T1.3 → T1.6 → T1.8 → T3.5 → T3.6 → T3.8 → T3.10`. 비크리티컬 작업 끼워넣기 금지.
- PRD에 없는 신규 기능 요청은 **먼저 `docs/NOTION_BLOG_PRD.md` 갱신** → ROADMAP 갱신 → 코드.

### 6.2 테스트 (러너 없음 — DoD의 일부)
- **API 연동 / 비즈니스 로직** (`lib/notion.ts`, `app/api/*/route.ts`): 정상 + 실패(401·외부 API 에러·빈 응답·타임아웃) + 엣지(경계값·중복 slug 등) **최소 3종 시나리오** 명시. 임시 스크립트는 `scripts/test/*.ts` (`tsx` 또는 `node --import tsx`).
- **UI / 사용자 인터랙션 / 페이지 흐름**: **Playwright MCP**(`mcp__playwright__*`)로 E2E 실측. 셀렉터보다 `browser_snapshot`(ARIA 트리) 우선.
- **회귀 방지**: 버그 수정 시 **재현 테스트를 먼저 작성** → 수정.
- 회귀 베이스라인: Notion에 `[regression-seed]` 접두 시드 글 1편 이상 유지. Playwright 시나리오는 이 시드를 우선 사용.

### 6.3 서브에이전트 호출 시점 (자동 호출 권장)
| 트리거 | 에이전트 |
|---|---|
| 의미 있는 코드 구현 완료 | `code-reviewer-kr` |
| 신규 기능 구현 직후 / TC 설계 요청 / 기존 테스트 실패 | `qa-engineer` |
| 코드 작성·수정 완료 후 역기획서 필요 | `reverse-planner` |
| PRD → ROADMAP 변환 / 새 기능군 로드맵 | `prd-roadmap-architect` |
| MVP PRD 신규 작성 | `prd-generator` |
| 스타터킷 정리·최적화 | `nextjs-starter-optimizer` (현재 단계 거의 사용 X) |

### 6.4 빌드·실행 명령
```bash
npm run dev            # Next 16 / Turbopack 기본
npm run build          # 프로덕션 빌드
npm run lint           # eslint (인자 없음)
npx prettier --write . # 포맷
npx shadcn@latest add <component>
```
대체 도구·러너 추가 금지.

---

## 7. 핵심 파일 상호작용 표준 (멀티 파일 동기화)

**규칙**: 아래 변경이 일어나면 **같은 PR/커밋**에서 명시된 파일을 전부 갱신한다.

| 변경 유형 | 함께 갱신해야 하는 파일 |
|---|---|
| Notion DB 속성 추가/변경 | `docs/NOTION_BLOG_PRD.md`(DataTable 절) → `types/index.ts`(`Post`/`PostSummary`) → `lib/notion.ts`(매핑) → `CLAUDE.md`(도메인 모델 절) → `shrimp-rules.md`(본 문서 4.1) |
| 라우트 추가/이름 변경 | `app/<...>/page.tsx` → `docs/NOTION_BLOG_PRD.md`(IA 절) → `docs/ROADMAP.md`(태스크) → `CLAUDE.md`(아키텍처 절) → `shrimp-rules.md` 2절 |
| 카테고리/태그 추가 | Notion DB(운영자) → 코드 변경 **불필요**. 단, 홈 카테고리 칩 노출 순서를 코드에서 하드코딩하지 말 것 |
| 환경변수 추가 | `.env.example` → `CLAUDE.md`(환경변수 절) → `docs/ROADMAP.md`(영향 태스크) → 사용 코드 |
| shadcn 컴포넌트 추가 | `components/ui/<name>.tsx`(생성) → `components.json` 자동 갱신 확인 → `CLAUDE.md` 아키텍처 절의 "현재 shadcn 컴포넌트 리스트" 갱신 |
| statusline 동작 수정 | **`.claude/statusline-command.sh`와 `.claude/statusline-command.ps1` 동시 수정** (둘 다 같은 동작이어야 함) |
| Slack/Hook 동작 수정 | `.claude/slack-notify.ps1` → `.claude/settings.json`(해당 hook) → `docs/HOOKS_PLANNING.md` |
| 캐시 정책 변경 | 호출부 `"use cache"` + `cacheLife()` → `CLAUDE.md` "주요 패턴" 절 → `docs/ROADMAP.md` 영향 태스크 |
| MVP 범위 변경 | `docs/NOTION_BLOG_PRD.md`(기능 명세서·Future 절) → `docs/ROADMAP.md`(태스크/마일스톤) → `CLAUDE.md`(MVP 범위 절) |
| 새 서브에이전트 추가 | `.claude/agents/<name>.md` → `CLAUDE.md`(Claude Code 통합 환경 절) → `shrimp-rules.md` 6.3 표 |

---

## 8. AI 의사결정 표준

### 8.1 P0 / P1 / Future 분기
- 요청이 들어오면 먼저 **PRD 기능 명세서 표**에서 우선순위 확인:
  - **P0** (홈, 글 목록·상세, 카테고리·태그·검색, Notion 페치, revalidate webhook): 즉시 진행.
  - **P1** (다크모드 — 이미 구현): 변경만 수행, 신규 P1 도입 시 **사용자에게 확인** 후 진행.
  - **Future**(댓글·RSS·시리즈·다국어·뉴스레터·조회수·OG 자동·서버 검색): **거절·연기**. PRD에 적힌 트리거 조건(예: 글 100개 초과) 충족 전까지 코드 신설 금지.
- 트리거 조건 충족 여부가 모호하면 사용자에게 1줄로 확인. 임의 도입 금지.

### 8.2 에러 핸들링 throw vs warn
- **빌드/데이터 무결성을 깨뜨리는 운영자 실수**(예: Slug 중복) → **`throw`**.
- **글 1편 단위 문제**(필수 속성 누락, 변환 실패) → **`console.warn` + 해당 글 스킵**. 전체 빌드 깨뜨리지 말 것.
- **외부 호출 실패**(Notion API 일시적 에러) → 호출자에게 throw하지 말고 빈 배열/`null` 반환 + warn. 페이지가 안전히 빈 상태를 렌더하도록(현재 페이지들이 이미 가정함).

### 8.3 카피 톤 판정
- 결과 카피를 "초보 페르소나 김지원이 읽었을 때 이해되는가?"로 1차 검수.
- 전문 용어가 필요한 경우 첫 등장 시 **괄호 풀이** 추가 (예: "ISR(작성한 글이 일정 시간마다 새로 빌드되는 방식)").
- 외래어 남발 금지. "PRD"·"DoD"는 문서 내부에서만 허용, 페이지 본문 카피에는 사용 금지.

### 8.4 모호한 사용자 요청
- "PRD에 X 추가" 같은 메타 요청은 **PRD → ROADMAP → 코드** 순으로 처리.
- 일반 코드 요청에서 우선순위·범위가 불명확하면 PRD/ROADMAP을 먼저 grep해서 근거를 찾는다. 그래도 없으면 1줄 질문(추측 금지).

### 8.5 새 의존성 vs 자체 구현
- 50줄 미만으로 구현 가능 + 보안/성능 영향 없음 → **자체 구현**.
- 그 외에는 5.7 트리 따른다.

---

## 9. 금지사항 (Prohibited)

### 9.1 보안·환경
- ❌ `NEXT_PUBLIC_NOTION_TOKEN`, `NEXT_PUBLIC_NOTION_DATABASE_ID` 등 **Notion 토큰을 `NEXT_PUBLIC_*`로 노출**.
- ❌ 클라이언트 컴포넌트(`"use client"` 파일)에서 `import ... from "@/lib/notion"`.
- ❌ `.env.local` 또는 실제 토큰 값을 git에 커밋.
- ❌ `.claude/settings.local.json` 커밋(이미 `.gitignore`됨 — 강제 추가 금지).

### 9.2 Next.js
- ❌ `export const revalidate = N` (대신 `"use cache"` + `cacheLife("minutes")`).
- ❌ `params` / `searchParams` 를 await 없이 사용.
- ❌ 동적 라우트에서 데이터 페치를 `<Suspense>` 밖에 두기.
- ❌ `next.config.ts`의 `cacheComponents: true` 제거.

### 9.3 UI / 스타일
- ❌ `@radix-ui/*` 신규 import (shadcn base-nova는 `@base-ui/react` 기반).
- ❌ `tailwind.config.ts` 신설.
- ❌ 마크다운 본문·콘텐츠에서 raw `<img>` 사용 (반드시 `next/image`).
- ❌ Toaster·ThemeProvider 페이지/레이아웃 재선언.
- ❌ raw className 문자열 결합(`a + " " + b`) — 무조건 `cn()`.

### 9.4 데이터·기능
- ❌ Slug 중복을 silently 처리(`throw` 필수).
- ❌ 필수 속성 누락 글을 `throw`로 처리(빌드 깨짐) — `warn`+스킵.
- ❌ 검색에 `fuse.js` / Algolia / Meilisearch / 별도 API 라우트 도입(Future).
- ❌ 댓글(Giscus)·RSS·시리즈·다국어·뉴스레터·조회수·OG 자동 생성 코드 신설(전부 Future, PRD 트리거 충족 전까지).
- ❌ 비공식 Notion scraper / `@notionhq/client` 외의 클라이언트 사용.

### 9.5 코드·문서
- ❌ 영문 응답·영문 커밋 메시지(한국어 강제).
- ❌ `lib/utils.ts`에 `cn()` 외 잡다한 유틸 누적 — 도메인별 파일 분리.
- ❌ `hook-test.txt` 수동 편집(Bash PreToolUse hook이 append).
- ❌ PRD/ROADMAP 갱신 없이 도메인 모델·라우트·MVP 범위 변경.
- ❌ `analyze_task` 호출(init_project_rules 가이드라인이 명시 금지).
