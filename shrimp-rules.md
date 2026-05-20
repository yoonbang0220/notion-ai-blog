# Development Guidelines

> **이 문서는 AI Agent 운영 전용 규칙이다.** 인간용 프로젝트 소개·아키텍처 설명은 `CLAUDE.md`·`docs/QUOTE_VIEWER_PRD.md`·`docs/ROADMAP.md` 에 있다. 본 문서는 명령형 규칙·다중 파일 조율·의사결정 트리만 담는다. 모호 상황에서는 본 문서 우선.

## 운영 컨텍스트

- **도메인**: Notion 기반 견적서 웹뷰어 + PDF 다운로드 MVP. SSOT 는 `docs/QUOTE_VIEWER_PRD.md`.
- **현재 단계**: W0(초기화) 완료. W1 시작 전. `lib/quotes.ts`·`app/q/[slug]/*`·`app/api/revalidate/route.ts` 모두 미구현.
- **태스크 ID 컨벤션**: `T<주차>.<번호>` (예: `T1.2`, `T2.3`). 작업 착수 전 `docs/ROADMAP.md` 의 해당 ID 섹션 우선 확인.
- **이전 도메인**(블로그 MVP) 자산은 `docs/archive/` 에 보존. **신규 코드에서 archive 내부 코드 import·복사 금지**.

## 우선 참조 순서 (코드 작성 직전)

1. `shrimp-rules.md` (본 문서) — 운영 규칙·금지 사항
2. `docs/ROADMAP.md` 의 해당 태스크 ID 섹션 — DoD·테스트 계획·의존성
3. `docs/QUOTE_VIEWER_PRD.md` — 도메인 모델·정합성 규칙·기능 명세
4. `CLAUDE.md` — 함정 노트·기술 스택 세부
5. 실제 코드 파일

→ 1~4를 건너뛰고 코드부터 작성하지 말 것.

---

## 다중 파일 동시 수정 매트릭스

**한 파일을 수정할 때 같이 손대야 할 파일 — 누락하면 정합성 깨짐.**

| 변경 대상 | 동시 수정 필수 | 사유 |
|----------|---------------|------|
| `lib/quotes.ts` (함수 시그니처) | `types/index.ts`, `scripts/test/quotes-*.ts`, `app/q/[slug]/page.tsx` | 타입·테스트·호출부 |
| `types/index.ts` (`Quote` / `QuoteItem` 필드 추가) | `docs/QUOTE_VIEWER_PRD.md` DataTable 표, `CLAUDE.md` 도메인 모델 표 (Invoice/Items), `docs/ROADMAP.md` T1.4 | SSOT 일관성 |
| Notion DB 스키마 변경 (Invoice/Items 속성 추가·삭제·rename) | `docs/SETUP_NOTION.md`, `CLAUDE.md` 도메인 모델 표 2종, `lib/quotes.ts` (normalizeQuote/getQuoteItems), `types/index.ts` | 운영자 셋업 가이드·코드·타입 일관성 |
| 새 Notion DB 추가 (예: Items 추가 시) | `.env.local`, `.env.example`, `CLAUDE.md` 환경변수 절, `lib/quotes.ts` (`requireEnv`) | 환경변수 동기화 |
| `app/q/[slug]/page.tsx` | `components/quote-view.tsx`(렌더), `app/q/[slug]/pdf/route.ts`(?print=1 호환) | 페이지·PDF 가 같은 컴포넌트 공유 |
| `app/q/[slug]/pdf/route.ts` | `components/quote-view.tsx`(인쇄 분기), `vercel.json`(memory 1024) | PDF 분기·메모리 |
| `app/api/revalidate/route.ts` (캐시 태그) | `lib/quotes.ts`·`app/q/[slug]/page.tsx`(`cacheTag('quote:${slug}')` 규칙) | 태그 문자열 1:1 일치 |
| `app/globals.css` (`@theme inline` 토큰) | `:root` + `.dark` 블록 양쪽 | 라이트·다크 토큰 쌍 |
| 새 Notion 이미지 호스트 등장 | `next.config.ts` `images.remotePatterns` | `next/image` 화이트리스트 |
| `.env.example` | `CLAUDE.md` "환경 변수 & 경로" 절 | 변수 목록 동기화 |
| `.claude/statusline-command.sh` | `.claude/statusline-command.ps1` | 크로스플랫폼 동일 동작 |
| 시드 견적 추가/이름 변경 | `docs/ROADMAP.md` "시드 견적 정책" 절, 영향 받는 Playwright 시나리오 | E2E 회귀 기준 |

→ 위 표에 없는 동시 수정은 발견 즉시 본 표에 추가.

---

## 도메인 모델 절대 규칙 (PRD 정합성 7종 → 명령형)

`lib/quotes.ts`·`components/quote-view.tsx`·`app/q/[slug]/*` 작성 시 **모두 강제**.

1. **Slug 중복 검출 → `throw new Error("Duplicate slug: <slug>")`**. catch·무시 금지. 페이지 렌더가 즉시 실패해야 한다.
2. **필수 5속성 누락 (`title` / `slug` / `status` / `issuerCompany` / `clientCompany`) → `console.warn` + 페이지 상단 "필수 정보 누락" 배너**. throw 금지 (1건 견적 때문에 전체 견적 시스템이 죽으면 안 됨).
3. **Slug 형식 위반 (32자 미만 또는 `/^[A-Za-z0-9_-]{32,}$/` 위반) → 페치 단계에서 `null` 반환 → 라우트는 `notFound()` 호출**. Notion 호출 자체가 발생하지 않아야 한다.
4. **Items 행 필수값 누락** (`Quantity` 또는 `UnitPrice` 가 null) → 해당 행은 `quantity=0`/`unitPrice=0` 로 처리 + `console.warn` (행 식별자 포함). **항목 0건** 시 빈 표 + 경고 배너 "항목이 없습니다". 임의로 결측치 추정 금지. (참고: 항목은 별도 `Items` DB 에 저장, `Invoice` Relation 으로 페치)
5. **`/q/[slug]` 및 `/q/[slug]/pdf` 응답 헤더에 `X-Robots-Tag: noindex, nofollow, noarchive` 강제** + `public/robots.txt` 에 `Disallow: /q/` 유지. 둘 중 하나 누락 금지.
6. **금액 계산**: `subtotal = Σ(quantity × unitPrice)` → `tax = Math.round(subtotal × taxRate / 100)` → `total = subtotal + tax`. **모두 정수 원 단위 반올림**. 부동소수 그대로 표시 금지. `subtotal`/`tax`/`total` 은 **항상 코드에서 자체 계산**. Notion 의 `Items.Amount`(Formula) / `Invoice.TotalAmount`(Rollup) 컬럼은 **운영자 UI 표시용 only — `lib/quotes.ts` 에서 읽지 말 것** (이중 진실 원천 방지, SSOT 보존).
7. **만료 견적** (`validUntil < now()`): `isExpired = true` → 상단 배너 노출, **본문 열람은 허용**. 페치 단계에서 차단·404·410 금지 (Phase 3 Future).

→ 위 7종 중 하나라도 코드에 빠지면 PR 자체가 거부 대상.

---

## Notion 페치 레이어 (`lib/quotes.ts`) 작성 규칙

### 강제 패턴

- **첫 줄**: `import "server-only";` — 누락 시 클라이언트 노출 위험.
- **`Client` 인스턴스화 시점**: 모듈 스코프 1회. 함수 안에서 재생성 금지.
- **`resolveDataSourceId()` 캐시**: `databases.retrieve({database_id})` → `data_sources[0].id` 를 모듈 로드 후 1회 호출해 캐시. 매 페치마다 호출 금지.
- **쿼리**: `dataSources.query({ data_source_id, filter, sorts, page_size, start_cursor })` 만 사용.
- **환경변수 접근**: `requireEnv("NOTION_TOKEN")` / `requireEnv("NOTION_DATABASE_ID")` 헬퍼 경유. `process.env.X!` 직접 사용 금지.
- **`isFullPage` 가드**: `dataSources.query` 결과의 각 row 에 `if (!isFullPage(row)) continue;` 패턴 강제. partial response 분기 안전.
- **`rich_text` → 문자열**: `.map(t => t.plain_text).join("")` 패턴 통일.

### 금지

- ❌ `notion.databases.query(...)` 호출 — **v5 에서 제거됨**. 발견 즉시 2단계 패턴으로 변환.
- ❌ `databases.create` 의 `properties` 파라미터 — 무시됨. DB 생성 후 `dataSources.update({data_source_id, properties: {...}})` 로 분리 호출.
- ❌ `NEXT_PUBLIC_` 접두사로 `NOTION_TOKEN` / `NOTION_DATABASE_ID` 노출.
- ❌ `lib/quotes.ts` 를 `scripts/test/*.ts` 에서 직접 import — `server-only` 가 Node 환경에서 throw. **테스트는 로직을 인라인 복제** (레퍼런스: `scripts/test/notion-client.ts` 의 `inlineQueryPublishedPages`).

---

## Next.js 16 빌드 게이트 규칙

`app/` 하위 라우트·페이지·라우트 핸들러 작성 시 **빌드를 깨뜨리지 않으려면 강제**.

- `params` / `searchParams` 는 **`Promise` 타입**. 사용 직전 `const { slug } = await params;` 강제. await 누락은 ts 에러.
- **동적 라우트(`[slug]`)의 데이터 페치 컴포넌트는 반드시 `<Suspense>` 안에 둘 것**. 그렇지 않으면 빌드 시 `Uncached data was accessed outside of <Suspense>` 에러. 패턴:
  ```
  app/q/[slug]/page.tsx  ← 정적 셸 + <Suspense fallback>
      └─ <QuoteData slug={slug}/>  ← "use cache" + cacheLife("minutes") + cacheTag(`quote:${slug}`)
          └─ <QuoteView .../>
  ```
- **ISR 의도는 `"use cache"` + `cacheLife("minutes")` 로만 표현**. `export const revalidate = N` 사용 금지.
- **캐시 태그 규칙**: 견적 단건은 `quote:${slug}`. 다른 형식 금지. `app/api/revalidate/route.ts` 의 `revalidateTag` 인자와 1:1 일치해야 함.
- **Route Handler 작성 시**: PDF·webhook 등 무거운 작업은 `export const runtime = "nodejs"` + `export const maxDuration = 30` 명시. Edge 런타임 사용 금지(Chromium 호환 불가).
- `middleware.ts` 는 지원되지만 향후 `proxy.ts` 마이그레이션 가능성 있음 — 새 파일 추가 직전 `node_modules/next/dist/docs/` 확인.

---

## UI 컴포넌트 작성 규칙

### shadcn/ui (`base-nova` 스타일) = `@base-ui/react` (Radix 아님)

- 컴포넌트 props 는 항상 **실제 `components/ui/*.tsx` 파일 확인** 후 작성. Radix UI props (`asChild`, `Slot` 등)를 기억 의존으로 쓰지 말 것.
- 신규 shadcn 컴포넌트 추가: `mcp__shadcn__search_items_in_registries` → `mcp__shadcn__get_add_command_for_items` → 명령 실행 순서. `npx shadcn@latest add <name>` 을 임의로 추측 금지.
- 컴포넌트 변형은 `class-variance-authority` (`cva`) 로. 레퍼런스: `components/ui/button.tsx`.
- className 병합: **무조건 `cn()` 사용** (`lib/utils.ts`). 직접 `clsx` 호출·문자열 concat 금지.

### Tailwind v4 (`tailwind.config.ts` 없음)

- 색상 토큰 추가/변경 위치: `app/globals.css` 의 `@theme inline` 블록. `:root` + `.dark` 양쪽 동시 정의.
- 색공간은 **oklch** 사용. hex/rgb 추가 금지.
- 다크모드 토글: `.dark` 클래스 + `@custom-variant dark (&:is(.dark *))` 패턴. 다른 셀렉터 추가 금지.

### 클라이언트 / 서버 컴포넌트

- 기본은 서버 컴포넌트. **브라우저 API·React hook 이 실제로 필요한 경우에만** 첫 줄에 `"use client";` 추가.
- `lib/quotes.ts` 같은 server-only 모듈을 import 하는 컴포넌트는 절대 `"use client"` 금지.
- 페이지 폼·복잡한 인터랙티브 블록은 `components/<feature>-form.tsx` 또는 `components/<feature>-view.tsx` 로 분리. `app/.../page.tsx` 는 얇은 서버 래퍼 유지.

---

## 테스트 작성 의무 (DoD 일부)

전통적 러너 없음. 다음 매핑 강제:

| 작업 유형 | 위치 | 도구 | 최소 시나리오 |
|----------|------|------|--------------|
| `lib/quotes.ts` 함수 | `scripts/test/quotes-*.ts` | `tsx` (devDep) | 정상 / 실패(401·빈응답) / 엣지(슬러그 형식·중복·표 위반) **3종 이상** |
| `app/api/*/route.ts` | `scripts/test/<name>.ts` 또는 Playwright | `tsx` + `browser_network_request` | 정상 / 인증 실패 / body 누락 / 잘못된 토큰 |
| UI / 페이지 흐름 | Playwright MCP | `mcp__playwright__*` | 시드 견적 기준 데스크톱 + 모바일(`browser_resize(375,667)`) + 다크모드 스크린샷 + 콘솔 에러 0 |
| 시각 회귀 | Playwright | `browser_take_screenshot({fullPage, filename})` | 베이스라인 비교 |

### 자기검증 스크립트 패턴 (필수)

- 파일 패턴: `scripts/test/<name>.ts`
- 실행: `node --env-file=.env.local --import tsx scripts/test/<name>.ts`
- 출력: 시나리오별 함수 + `=== 결과 요약 ===` 표 + `process.exitCode = 0/1`
- 레퍼런스: `scripts/test/notion-client.ts`
- 새 lib 함수 추가 시 동일 패턴의 자기검증 스크립트 동시 추가. PR 에 스크립트 없으면 DoD 미달.

### Playwright MCP 기본 함수 (UI 검증)

`mcp__playwright__browser_navigate` / `browser_snapshot` / `browser_click` / `browser_fill_form` / `browser_network_request` / `browser_take_screenshot` / `browser_console_messages` / `browser_resize` / `browser_evaluate`. ARIA 트리 기반 `browser_snapshot` 을 셀렉터보다 우선 사용.

### 회귀 방지

버그 수정 시 **재현 테스트를 먼저 작성** → 실패 확인 → 수정 → 통과 확인 순서. 수정만 먼저 푸시 금지.

---

## 의존성 추가 규칙

### 잔존 dep 4종 — import 금지

`notion-to-md` / `react-markdown` / `remark-gfm` / `rehype-highlight` 는 `package.json` 에 남아있지만 사용처 0건. **새 코드에서 import 시 즉시 거부 대상**. 견적 항목은 Notion `table` 블록 직접 파싱.

### 신규 패키지 설치

| 패키지 | 시점 | 버전 정책 | 비고 |
|--------|------|---------|------|
| `nanoid` | T1.1 직전 (slug 자동화 선택 시) | latest | 운영자가 Notion Formula 채택 시 불필요 |
| `puppeteer-core` | T2.1 시작 시 | **정확 버전 고정** (`^`/`~` 금지) | `@sparticuz/chromium` 과 호환 매트릭스 확인 후 |
| `@sparticuz/chromium` | T2.1 시작 시 | **정확 버전 고정** | Vercel Function 용. 풀 `puppeteer` 절대 금지 (50MB 초과) |

→ 위 외 라이브러리 신규 추가 직전 사용자 결정 요청. 임의 설치 금지.

---

## 태스크 진행 규칙

1. 작업 시작 전 `docs/ROADMAP.md` 의 **태스크 ID 섹션 정독** (DoD·테스트 계획·의존성·리스크).
2. 의존성 미충족 태스크 착수 금지. 예: `T1.5` 전에 `T1.2`/`T1.3`/`T1.4` 완료 확인.
3. 태스크 종료 조건: 인수 조건 + 정의된 테스트 시나리오 통과 + DoD 체크리스트 모든 항목 완료.
4. 산출물 파일이 매트릭스(위)에 등장하면 동시 수정 강제.
5. PRD 자가검증 5종(PDF 방식·slug 생성·항목 표 위치·부가세 기본값·만료 정책)이 미결정인 태스크 — **사용자 결정 받기 전 코드 작성 금지**.
6. 신규 로드맵·기능 분해는 `prd-roadmap-architect` 서브에이전트 호출.
7. 코드 구현 완료 시 `code-reviewer-kr` 서브에이전트 호출 권장 (자동).

---

## 언어/응답 규칙

- **응답·주석·커밋 메시지·문서**: 한국어.
- **변수명·함수명·라이브러리명·기술 용어**: 영어.
- 한국어 변수명 / Konglish 함수명 금지 (예: `견적Get` ❌, `getQuote` ✅).
- 커밋 메시지는 `/git:commit` 슬래시 명령 사용 시 자동 한국어 생성.

---

## AI 의사결정 트리 (모호 상황별)

| 상황 | 1순위 행동 | 2순위 | 금지 |
|------|----------|------|------|
| `databases.query(...)` 작성 충동 | 즉시 중단 → `databases.retrieve` + `dataSources.query` 2단계로 변환 | — | v5 SDK 에서 `databases.query` 호출 |
| `[slug]` 라우트에서 데이터 페치 위치 | `<Suspense>` 안에 별도 컴포넌트로 격리 | — | 페이지 컴포넌트 본문에서 직접 await |
| 슬러그 32자 미만 발견 | 페치 단계에서 `null` 반환 → 라우트 `notFound()` | — | Notion 호출 강행 |
| 중복 slug 발견 | `throw new Error("Duplicate slug: ...")` | — | 첫 결과 반환·로깅만 |
| 필수 5속성 누락 발견 | `console.warn` + 배너 노출 | 해당 필드 `null` 채움 | throw / 빈 페이지 반환 |
| 항목 표 컬럼 위반 | 빈 표 + 경고 배너 + `console.warn` | — | 컬럼 매핑 추측 |
| 만료 견적 발견 | 본문 노출 + 상단 배너 (`isExpired={true}`) | — | 404·410·차단 |
| Notion 이미지 src 사용 | `next/image` 로 래핑 | — | `<img src={notionFileUrl}>` 직접 사용 (1시간 만료) |
| 새 라이브러리 import 직전 | 잔존 4종 dep 체크 → CLAUDE.md "의존성 추가 규칙" 확인 → 사용자 결정 | — | 임의 `npm install` 후 import |
| `lib/quotes.ts` 첫 줄 | `import "server-only";` | — | 누락 후 클라이언트 컴포넌트에서 import |
| 테스트 스크립트에서 lib 모듈 호출 | 로직 인라인 복제 + v5 SDK 직접 호출 | — | `import "@/lib/quotes"` (가드 throw) |
| `cacheTag` 문자열 작성 | `` `quote:${slug}` `` 형식 고정 | — | 임의 prefix·구분자 |
| 한글 PDF 파일명 | `Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(...)}` (RFC 5987) | — | `filename=` 만 사용 (한글 깨짐) |
| 모호한 요구사항 | PRD → ROADMAP → CLAUDE.md 순으로 근거 탐색 → 없으면 사용자 질문 | — | 추측으로 구현 진행 |

---

## 금지 사항 (Prohibited Actions)

- ❌ `notion.databases.query(...)` 호출 (v5 제거됨).
- ❌ `NEXT_PUBLIC_NOTION_TOKEN` / `NEXT_PUBLIC_NOTION_DATABASE_ID` 또는 클라이언트 컴포넌트에서 `lib/quotes.ts` import.
- ❌ `notion-to-md` / `react-markdown` / `remark-gfm` / `rehype-highlight` import.
- ❌ 견적 항목을 Notion `table` 블록 외 위치(child DB·페이지 본문 텍스트)에서 파싱.
- ❌ `subtotal` / `tax` / `total` 을 Notion 속성으로 저장 (코드 계산이 SSOT).
- ❌ `lib/quotes.ts` 에서 Notion 의 `Items.Amount`(Formula) 또는 `Invoice.TotalAmount`(Rollup) 컬럼 값을 읽어 사용 (표시용 only, 항상 자체 계산).
- ❌ 동적 라우트에서 데이터 페치를 `<Suspense>` 밖에서 await.
- ❌ `params` / `searchParams` 를 `await` 없이 사용.
- ❌ `export const revalidate = N` 으로 ISR 표현.
- ❌ Edge 런타임에서 `puppeteer-core` 호출.
- ❌ 풀 `puppeteer` 패키지 설치.
- ❌ `puppeteer-core` / `@sparticuz/chromium` 을 `^` 또는 `~` 로 설치.
- ❌ 임의로 새 라이브러리 `npm install` 후 사용자 통지 없이 import.
- ❌ `docs/archive/` 내부 코드를 신규 코드에서 import·복사.
- ❌ `app/__*` / `app/_*` 같은 private folder 에 라우트 테스트 페이지 작성 (Next.js 가 인식 안 함).
- ❌ `scripts/test/*.ts` 에서 `@/lib/quotes` 직접 import (`server-only` throw).
- ❌ `.claude/settings.local.json` 을 git 에 add (`webhook URL` 등 민감값 포함 가능).
- ❌ `hook-test.txt` 수동 편집.
- ❌ Notion `file.url` 을 `<img src>` 에 직접 사용 (1시간 만료).
- ❌ shadcn/ui props 에 Radix UI API (`asChild`, Radix `Slot` 등) 사용.
- ❌ 정합성 규칙 7종 중 하나라도 누락한 채로 페치/렌더 코드 머지.
- ❌ 테스트 시나리오 없이 `lib/quotes.ts` 함수 추가.
- ❌ 한국어 변수명·함수명·파일명 사용.
