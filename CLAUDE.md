# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

이 저장소에서 Claude Code(claude.ai/code)가 작업할 때 따라야 할 지침이다.

@AGENTS.md

## 언어 규칙

- **응답·주석·커밋 메시지·문서**: 한국어
- **변수명·함수명**: 영어 (코드 표준 준수)

## 명령어

```bash
npm run dev          # 개발 서버 (Next.js 16 / Turbopack 기본)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run lint         # ESLint (package.json은 `eslint`만 — 인자 없이 전체 검사)
npm run test:quotes  # 견적 데이터 레이어 자기검증 (getQuoteBySlug·getQuoteItems·calculateTotals, 7시나리오)
                     # 내부: node --env-file=.env.local --import tsx scripts/test/quotes-client.ts
                     # 실 Notion 페치 포함 — 데이터 레이어(T1.2/T1.3) 변경 시 이걸로 검증
npm run test:notion  # (레퍼런스) Notion v5 SDK 4종 시나리오 — 블로그 시절 작성, 패턴 참고용
                     # 내부: node --env-file=.env.local --import tsx scripts/test/notion-client.ts
npm run test:pdf-spike  # PDF 토대 검증 (T2.1) — example.com → out/spike.pdf, 환경분기·메모리 3시나리오. dev 서버 불필요
npm run test:pdf-route  # PDF 라우트 통합 (T2.3) — ⚠️ 먼저 `npm run dev` 필요. /q/<slug>/pdf 정상·404·한글파일명 5시나리오
npm run test:revalidate # revalidate webhook (T2.4) — ⚠️ 먼저 `npm run dev` 필요. Bearer 401/403/400/200 + robots/헤더 9시나리오
npm run test:rate-limit # 레이트리밋 (T2.7) — checkRateLimit 고정창·429·sweep 5시나리오. dev 서버 불필요
npm run test:admin-auth   # 관리자 인증 (T3.1) — Web Crypto 세션 sign/verify·timingSafeEqual 비번·위조·만료 5시나리오. dev 불필요(인라인 복제)
npm run test:admin-quotes # 관리자 목록 페치 (T3.2) — queryPublishedQuotes 정상·401·빈결과·페이지네이션·경량 5시나리오. 실 Notion 페치
npx prettier --write .            # 전체 포맷팅
npx shadcn@latest add <component> # shadcn/ui 컴포넌트 추가
```

`test:notion`은 실제 Notion API에 붙는다 — `.env.local`에 `NOTION_TOKEN` / `NOTION_DATABASE_ID`가 채워져 있어야 한다. 새 lib 단위 테스트 스크립트도 동일 패턴(`scripts/test/<name>.ts` + `tsx`)으로 추가한다.

테스트 러너·pre-commit hook 모두 미설정. 대신 **UI/사용자 흐름 검증은 Playwright MCP**(`mcp__playwright__*`)로 수행한다 — 자세한 정책은 아래 "테스트 정책" 절 참고.

## 프로젝트 정체성

이 저장소는 **Notion 기반 견적서 웹뷰어 + PDF 다운로드 MVP** 다. 단일 출처: `docs/QUOTE_VIEWER_PRD.md`.
이전 단계의 Notion CMS 블로그 MVP 자산은 `docs/archive/` 에 보존되어 있다(2026-05-17 견적서 도메인으로 전환).

**Goal**: 운영자는 견적 1건을 5분 안에 만들어 링크로 공유할 수 있고, 클라이언트는 링크를 받은 즉시 PC·모바일 어디서든 견적서를 열람한 뒤 결재용 PDF를 1회 클릭으로 받아 사내에 올릴 수 있다.

**타겟 페르소나**:
- **운영자(발행자)** — 박상준(35세, 디자인 에이전시 대표). Notion 으로 프로젝트·일정·고객을 관리하는 1인~소규모 사업자. 월 5~10건의 견적을 직접 발행.
- **클라이언트(수신자)** — 김혜진(40대, 중소기업 대표). 디지털 도구에 능숙하지 않으며 회원가입을 강하게 거부. 카톡 링크를 휴대폰에서 먼저 연다.

**MVP 범위 (P0 — 빠지면 안 됨)**: Notion 견적 페치 / `/q/[slug]` 견적서 렌더 페이지(데스크톱+모바일 반응형) / 항목·합계 자동 계산 / "PDF 다운로드" 버튼 / 추측 불가 URL(slug ≥32자) / `Status=Published` 게이트(`Draft`/`Archived` 는 404) / 만료 견적 상단 배너 / on-demand revalidate webhook.

**Future (지금 만들지 말 것)**: 비밀번호 보호 견적, 만료일 후 자동 410 차단, 클라이언트 열람 알림, 견적 버전 히스토리, 전자 서명·동의, 로고·브랜드 컬러 커스터마이즈, 다국어/다중 통화, 운영자 대시보드, 견적 항목 표 child DB 분리, 멀티 테넌트. 모두 "지금 빠져도 Goal 검증에 지장 없음" 이 기준이다.

**진행 상태 / 일정** (PRD 기준, 상세 분해는 `docs/ROADMAP.md`):
- 일정: 파트타임 2주(W1 / W2, MVP) + W3(v1.x 고도화). 태스크 ID 컨벤션 `T1.x` / `T2.x` / `T3.x`.
- **W0 (초기화) 완료** — 블로그 도메인 자산 제거, 견적서 도메인 기반 정돈.
- **W1 완료** — ✅ T1.1~T1.8 (Notion 시드 → `getQuoteBySlug`/`getQuoteItems`/`calculateTotals` → 도메인 타입 → `/q/[slug]` 셸+Suspense+noindex → `<QuoteView>` 반응형 → `isQuoteExpired` 만료 판정 → 랜딩 `/` 정식화) + code-reviewer-kr 리뷰·quick fix 반영. `npm run test:quotes` 10/10, `npm run build`(`/` Static + `/q/[slug]` Partial Prerender) 통과. T1.8 은 quote-ui-designer 검증(2026-05-21): build `/` `○ Static` 유지 + Playwright 데스크톱·모바일·다크 3종 통과.
- **W2 완료 (MVP launch)** — ✅ T2.1(puppeteer-core+@sparticuz/chromium·pdf-spike) · T2.2(Pretendard 폰트) · T2.3(`/q/[slug]/pdf` PDF 라우트) · T2.4(`/api/revalidate` Bearer webhook) · T2.5(robots.txt) · T2.6(Playwright E2E 7종 PASS) · T2.7(배포 전 하드닝: `app/error.tsx`·`lib/rate-limit.ts`·폰트 서브셋 452KB) + code-reviewer-kr quick fix 반영. tsc·lint·build·test:quotes 10/10·pdf-route 5/5·revalidate 9/9. ✅ **T2.8 배포·production 실측 (2026-05-23 완료)** — Vercel `notion-ai-blog-zeta.vercel.app`: 랜딩·견적·환경변수·noindex·**PDF**(서버리스 Chromium 3중 수정: `serverExternalPackages`→`outputFileTracingIncludes`(bin)→`launchBrowser` ETXTBSY 재시도; 웜 3.3~4.3s·동시 5/5 200) · **revalidate webhook E2E** 401/403/400/200 · **Lighthouse 랜딩** Perf 84·A11y/BP/SEO 100(LCP 4.5s). 콜드스타트 15.3s = **R4 accept+백로그**(window.print 미채택). 잘못된/Draft slug → not-found UI(soft-404, noindex 영향 0). 이연 E·I 라이브는 운영자 데이터 보존 위해 메커니즘 커버. 리포트: `docs/PHASE2_LAUNCH_REPORT.md`. **런치 비차단 백로그**: LCP 최적화·하드 404 상태·콘텐츠 통합 E2E·콜드 단축·분산 리밋(KV)·보안헤더·VRT·(선택)커스텀 도메인.
- **W3 (Phase 3 / v1.x 고도화) 완료 (2026-05-22)** — ✅ T3.1(관리자 인증 게이트 — `lib/admin-session.ts` Web Crypto 서명 세션·`lib/admin-auth.ts` server-only·`/admin/login`·`proxy.ts` matcher `/admin/:path*` 게이트·R13/R15 대응) · T3.2(`lib/quotes.ts::queryPublishedQuotes()` 발행 목록 경량 페치 + `QuoteListItem`) · T3.3(`app/admin/page.tsx` + `components/admin/quote-list.tsx` 반응형 목록, `/admin` ◐) · T3.4(`components/admin/copy-link-button.tsx` 클립보드 복사) · T3.5(다크모드 검증·`docs/PHASE3_DARKMODE_NOTE.md`, 신규 빌드 0). 검증: tsc·lint·build·`test:admin-auth` 5/5·`test:admin-quotes` 5/5 + Playwright(인증·목록·복사·다크·보안회귀) + code-reviewer-kr 각 4.5/5. 신규 npm install 0. 결정값: 인증=env 비번(`ADMIN_PASSWORD`)+서명 세션 쿠키(`ADMIN_SESSION_SECRET`)·세션 30일·목록=발행만·`/admin` 경로. ⚠️ production `/admin` 로그인은 Vercel 환경변수 `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` 등록 필요(미설정 시 fail-closed).
- 크리티컬 패스: `lib/quotes.ts → app/q/[slug]/page.tsx → app/q/[slug]/pdf/route.ts → app/api/revalidate/route.ts → robots/noindex → Playwright E2E → Vercel 배포`. **✅ MVP(Phase 0~2) launch 완료 (2026-05-23)** — 배포·PDF·revalidate prod E2E·Lighthouse 실측 + 콜드스타트 R4 accept. 이후는 W3(완료) 및 측정 기반 백로그.
- 작업 착수 전 `docs/ROADMAP.md` 해당 태스크 ID 섹션을 우선 확인할 것 (DoD·테스트 계획·의존성·리스크 포함).

## 도메인 모델 (Notion DB)

Notion 에 **`Invoice` Database + `Items` Database 2개** 를 운영자가 직접 만든다 (PRD 자가검증 3번의 대안 채택, 2026-05-17 결정). 견적 1건 = `Invoice` 행 1개 + 그 견적에 속한 `Items` 행 N개. `Items` 의 `Invoice` 속성(Relation 타입) 으로 일대다 연결. 셋업 절차: `docs/SETUP_NOTION.md`.

### `Invoice` DB — 견적 메타데이터 (12속성: 입력 9 + 자동 3)

> ⚠️ **실제 Notion 속성명·상태 옵션은 한글이다** (운영자가 한글로 생성, 2026-05-20 **Path B** 확정 — Notion 한글 유지, 코드에서 매핑). `lib/quotes.ts` 에 `PROP`(속성명 한글↔TS 필드) · `STATUS`(상태값 한글↔영문) 매핑 상수를 두고 정규화 단계에서 변환한다. 아래 표 **첫 열이 실제 Notion 키**(이 문자열로 `page.properties["제목"]` 접근), `TS 필드` 열이 코드 도메인명(영문)이다. **하드코딩으로 영문 키(`"Title"` 등)를 절대 쓰지 말 것** — 실제 DB 에 없어 즉시 404/`<없음>`.

| # | Notion 속성(한글, 실제 키) | 타입 | TS 필드 | 비고 |
|---|---|---|---|---|
| 1 | `제목` | title | `title` | 내부 식별용 (클라이언트 미노출). 예: `[regression-seed-active] ABC 로고 견적` |
| 2 | `상태` | select (`초안`/`발행`/`보관`) | `status` (`STATUS` 매핑) | `발행`→`Published` 만 노출. `초안`/`보관`→404. 필터 `select: { equals: "발행" }` |
| 3 | `견적번호` | rich_text | `quoteNumber` | 예: `Q-2026-0001` |
| 4 | `고객사` | rich_text | `clientCompany` | |
| 5 | `발행사` | rich_text | `issuerCompany` | 운영자 본인 회사명 |
| 6 | `발행일` | date | `issuedAt` (ISO 8601) | |
| 7 | `유효기간` | date | `validUntil` (ISO 8601) | 지나면 만료 배너 |
| 8 | `부가세율` | number | `taxRate` | 기본 10. 0 입력 시 부가세 행 숨김 |
| 9 | `비고` | rich_text (multi-line) | `notes` | 자유 텍스트 |
| 10 | `슬러그` | **formula** | `slug` | 자동. 수식 `replaceAll(id(), "-", "")` → 32자 hex. ⚠️ **서버 필터 불가** — `상태=발행` 으로만 query 후 코드에서 `getFormulaString(슬러그) === slug` 비교(아래 운영자 결정 기록 참조) |
| 11 | `항목` | relation 역참조 | (역참조) | Items.`견적` 이 자동 생성. UI 편의용, 코드 미사용 |
| 12 | `총금액` | **rollup** | (코드 미사용) | 자동. Items → `금액` → Sum. **운영자 UI 표시용. 코드는 절대 읽지 말고 자체 계산** |

> `ClientContact`(받는 분 담당자) 속성은 운영자가 만들지 않음 → `clientContact` 는 항상 `null` (타입에는 `string | null` 로 존재, MVP 미사용. 실측 2026-05-20: Invoice DB 12속성에 부재).

### `Items` DB — 견적 항목 (6속성: 입력 5 + 자동 1)

| # | Notion 속성(한글, 실제 키) | 타입 | TS 필드 | 비고 |
|---|---|---|---|---|
| 1 | `항목명` | title | `name` | 항목명. 예: `로고 디자인` |
| 2 | `견적` | **relation → 견적(Invoice) DB** | `invoiceId` (page ref) | Limit: No limit. Show on 견적 체크. 필터: `relation: { contains: invoiceId }` |
| 3 | `수량` | number | `quantity` | 수량 |
| 4 | `단가` | number | `unitPrice` | 단가 (원 단위 정수) |
| 5 | `비고` | rich_text | `note` | 비고 (선택) |
| 6 | `금액` | **formula** | (코드 미사용) | 자동. 수식 `수량 * 단가`. **운영자 UI 표시용. 코드는 절대 읽지 말고 자체 계산** |

### 코드 계산 (derived, Notion 저장 금지)

| 필드 | 계산식 | 비고 |
|---|---|---|
| `amount` (행별) | `quantity × unitPrice` | `QuoteItem` |
| `subtotal` | `Σ items.amount` | `QuoteTotals` |
| `tax` | `Math.round(subtotal × taxRate / 100)` | 정수 원 단위 |
| `total` | `subtotal + tax` | |

> 도메인 타입(`Quote`, `QuoteItem`, `QuoteTotals`, `QuoteStatus`)은 W1 의 T1.2-types 에서 `types/index.ts` 에 정의됨. W3 에서 관리자 목록용 경량 타입 `QuoteListItem`(6필드: slug·title·clientCompany·quoteNumber·issuedAt·status) 추가.
> `Items` 정렬은 Notion 기본 `created_time` 오름차순. 코드 `sorts: [{ timestamp: "created_time", direction: "ascending" }]` 명시.
> **금액(Amount) 속성을 Notion 에 만들지 말 것** — 코드 계산이 SSOT (이중 진실 원천 방지).

**정합성 규칙 (코드에 반드시 반영)**
1. **Slug 중복** → `getQuoteBySlug` 가 2건 이상 받으면 `throw new Error("Duplicate slug: <slug>")`. 페이지 렌더 즉시 실패해야 한다(데이터 손상 신호).
2. **필수 속성 누락** (`title` / `slug` / `status` / `issuerCompany` / `clientCompany` 중 하나라도) → `console.warn` + 페이지 상단에 "필수 정보 누락" 배너. 견적서 전체를 빈 화면으로 노출하지 않는다.
3. **Slug 형식** — 32자 미만 또는 영숫자/`_`/`-` 외 문자 포함 시 페치 단계에서 404 (Notion 호출 발생 금지).
4. **Items 행별 필수값 누락** — `Quantity` 또는 `UnitPrice` 가 null 인 행은 `quantity=0`/`unitPrice=0` 로 처리 + `console.warn` (행 식별자 포함). 항목 전체가 0건일 경우 빈 표 + 경고 배너 "항목이 없습니다".
5. **검색엔진 차단** — `/q/[slug]` 응답에 `X-Robots-Tag: noindex, nofollow` 강제 + `public/robots.txt` 에서 `/q/` Disallow.
6. **금액 계산** — `subtotal` / `tax` / `total` 은 Notion 속성으로 저장하지 않고 페치 시 코드에서 계산. 모두 정수 원 단위 반올림.
7. **만료 견적** — `validUntil < now()` 면 `isExpired = true` → 상단 배너 노출(열람은 허용. 410 차단은 Future).

**캐시 정책**: 견적 페이지 단위로 `"use cache"` + `cacheLife("minutes")`. 즉시 반영이 필요하면 Notion 외부 자동화(Make/Zapier) → `/api/revalidate` POST → `revalidateTag('quote:${slug}')`.

**PDF 생성**: `/q/[slug]/pdf` → `@sparticuz/chromium` + `puppeteer-core` 로 동일 페이지를 `?print=1` URL 로 헤드리스 인쇄 → `application/pdf` 응답. 한글 폰트는 Pretendard 또는 Noto Sans KR 을 `next/font/local` 로 임베드. 파일명: `Content-Disposition: attachment; filename="견적서_<clientCompany>_<YYYYMMDD>.pdf"`. (다운그레이드 옵션 — `window.print()` + 인쇄 전용 CSS — 은 PRD 자가검증 1번 참고.)

## 기술 스택 & ⚠️ 함정 노트

- **Next.js 16.2.6** (App Router)
  - `params` / `searchParams`는 **`Promise` 타입** → 반드시 `await`.
  - `next.config.ts`에서 `cacheComponents: true` 활성화 → 서버 컴포넌트 내 비동기 함수에 `"use cache"` 지시자 사용 가능.
  - **동적 라우트(`[slug]`)에서 `params` 를 await 하는 부분까지 반드시 `<Suspense>` 안에 둬야 빌드가 통과한다** (Cache Components prerender 규칙). ⚠️ 실측(T1.5): 셸에서 `await params` 만 해도 `Uncached data was accessed outside of <Suspense>` 로 막힌다. → 패턴: 셸은 `params`(Promise)를 받기만 하고, `<Suspense>` 안의 resolver 컴포넌트에서 `await params` → 추출한 `slug`(plain string)를 `"use cache"` 데이터 컴포넌트에 prop 으로 전달. 레퍼런스: `app/q/[slug]/page.tsx`(셸+resolver) + `app/q/[slug]/quote-data.tsx`(`"use cache"`).
  - ISR 의도(예: 1~5분 갱신)는 `"use cache"` + `cacheLife("minutes")` 로 표현한다(`revalidate` export 대신). ⚠️ `cacheLife`/`cacheTag` 는 **`next/cache` 의 stable export** (`unstable_` 접두 아님, 16.2.6 실측). 단건 캐시 태그는 `quote:${slug}` 규칙.
  - ⚠️ **`middleware.ts` 컨벤션은 16.2.6 에서 deprecated → `proxy.ts` 로 리네임됨**(기능 동일, 빌드 출력엔 `ƒ Proxy (Middleware)` 로 표기). 신규 코드는 루트 `proxy.ts` 사용. 레퍼런스: `proxy.ts`(`/q/*` 응답에 `X-Robots-Tag` 강제).
- **React 19.2.4**
- **TypeScript 5** (`strict: true`)
- **Tailwind CSS v4** — `tailwind.config.ts` 없음. 토큰은 `app/globals.css` 의 `@theme inline` 블록에서 정의. `@import "shadcn/tailwind.css"` 포함.
- **shadcn/ui (`base-nova` 스타일)** — ⚠️ **Radix UI 가 아닌 `@base-ui/react` 기반.** 컴포넌트 API 가 기존 shadcn 과 다르므로 props 는 항상 실제 파일에서 확인. 폼 빌딩은 `field.tsx`(Field/FieldLabel/FieldGroup 등) + `separator.tsx` 조합을 사용한다.
- **next-themes** — `ThemeProvider`, 루트 `<html>` 에 `suppressHydrationWarning` 필수.
- **sonner** — `<Toaster>` 는 루트 레이아웃(`app/layout.tsx`) 에 이미 포함됨. 페이지별 재선언 금지.
- **lucide-react** — 아이콘.
- **Notion API (`@notionhq/client` v5)** — 토큰은 서버 전용(`NOTION_TOKEN`/`NOTION_DATABASE_ID`). `NEXT_PUBLIC_` 절대 금지.
  - ⚠️ **v5 breaking change** — `notion.databases.query` 가 **제거됐다**. 대신 `databases.retrieve({database_id})` 로 응답의 `data_sources[0].id` 를 받아 `dataSources.query({data_source_id, filter, sorts, page_size, start_cursor})` 를 호출한다. v1 시절 코드·튜토리얼은 그대로 못 쓴다.
  - ⚠️ **`databases.create` 의 `properties` 파라미터도 v5 에서 무시된다** — DB 생성 후 `dataSources.update({data_source_id, properties: {...}})` 로 속성을 정의해야 한다. 기존 `Name`(title) 속성 rename 은 `{Name: {name: "Title"}}` 패턴.
  - 견적서 lib (`lib/quotes.ts`) 작성 시 위 2단계 패턴을 모듈 로드 후 한 번만 수행하는 `resolveDataSourceId()` 캐시 함수가 필요하다. 레퍼런스: `scripts/test/notion-client.ts` 의 `inlineQueryPublishedPages` 가 동일 패턴을 구현한다.
- **`server-only` 가드** — `lib/quotes.ts` 첫 줄 `import "server-only"` 필수. 클라이언트 컴포넌트에서 import 시 Turbopack 빌드가 즉시 실패한다. ⚠️ 가드 동작을 검증할 때 `app/__*` / `app/_*` 폴더는 Next.js private folder 규칙으로 라우트로 인식되지 않으니 검증용 페이지는 일반 폴더에 만들 것. 또한 순수 Node.js 환경(`tsx`/`node --import tsx`)에서는 `react-server` condition 이 없어 throw 하므로, `scripts/test/*.ts` 는 lib 모듈을 직접 import 하지 말고 동일 로직을 인라인 복제(또는 v5 SDK 만 직접 사용)한다.
- **PDF 생성 (W2)** — ✅ `@sparticuz/chromium@148` + `puppeteer-core@24.43.1`(호환 핀) 설치 완료. launch 환경 분기는 `lib/pdf-browser.ts`(로컬 시스템 Chrome `executablePath` vs 서버리스 `chromium.executablePath()`+`headless:"shell"`). Vercel Function 메모리는 `vercel.json` `functions` 에서 1024MB/maxDuration 30 지정. ⚠️ `@sparticuz/chromium@148` 엔 `chromium.headless` 가 없어 `"shell"` 직접 지정. ⚠️ `cacheComponents:true` 환경에서 Route Handler 에 `export const runtime` 금지(빌드 충돌, 기본 nodejs).
- **`next.config.ts` `images.remotePatterns`** — Notion 이미지는 `prod-files-secure.s3.us-west-2.amazonaws.com` / `s3.us-west-2.amazonaws.com` / `www.notion.so` 3종 호스트에서 서빙되며 이미 등록돼 있다. Notion 새 호스트 추가 시 같이 갱신.
- ⚠️ **블로그 시절 잔존 dependencies** — `notion-to-md`, `react-markdown`, `remark-gfm`, `rehype-highlight` 4개는 `package.json` 에 남아있지만 견적서 도메인 소스 코드에서 사용처 0건이다. **신규 코드에서 import 하지 말 것**. 견적 항목은 Notion `table` 블록을 직접 파싱하므로 마크다운 변환·렌더링 라이브러리는 필요 없다. 정리(`npm uninstall`)는 별도 결정 사항.

## 아키텍처

```
app/                  # 페이지·라우트 핸들러 (App Router)
  layout.tsx          # 루트 레이아웃 (ThemeProvider · Header · main · Footer · Toaster)
  page.tsx            # ✅ T1.8 — 정식 정적 랜딩 (운영자용 소개. 히어로 + 3스텝 안내, ○ Static)
  q/[slug]/           # 견적서 열람·PDF (아래 "견적서 라우트")
  admin/              # ✅ W3 — 운영자 관리 화면 (인증 게이트 뒤 목록·로그인, 아래 "관리자 라우트")
  api/revalidate/     # ✅ T2.4 — revalidate webhook
  error.tsx           # ✅ T2.7 — 전역 에러 경계 (한국어 안내 + 다시시도/홈으로, 내부 에러 비노출)
  not-found.tsx       # 404
  globals.css         # Tailwind v4 토큰 (@theme inline) + 다크모드
components/
  ui/                 # shadcn/ui (base-nova) — button, card, field, input, label, separator, sonner
  common/             # Header, Footer, ThemeProvider, ThemeToggle
  quote-view.tsx      # ✅ T1.6 — 견적서 표시(반응형 표↔카드, 서버 컴포넌트)
  admin/              # ✅ W3 — quote-list(목록 표/카드)·quote-list-skeleton·copy-link-button(클립보드)
lib/
  utils.ts            # cn() — clsx + tailwind-merge
  quotes.ts           # Notion 페치·정규화·합계·queryPublishedQuotes (server-only) — 아래 라우트 블록 참고
  admin-auth.ts       # ✅ W3 — 관리자 세션 server-only (timingSafeEqual 비번·cookies·requireAdminSession 2중검증)
  admin-session.ts    # ✅ W3 — Web Crypto 세션 sign/verify (proxy 공유 → server-only 미적용, R13)
  rate-limit.ts       # ✅ T2.7 — in-memory 레이트리밋 (PDF·revalidate)
  pdf-browser.ts      # ✅ T2.1/T2.3 — puppeteer launch 환경 분기
types/index.ts        # ThemeMode + 견적 도메인(Quote/QuoteItem/QuoteTotals/QuoteStatus) + QuoteListItem(W3 목록 경량)
scripts/test/         # *.ts 자기검증 (tsx). notion-client(레퍼런스 패턴) · quotes/admin-auth/admin-quotes/pdf/revalidate/rate-limit
public/               # 정적 자산. robots.txt(Disallow:/q/·/admin) · fonts/PretendardVariable.subset.woff2(T2.2·T2.7 서브셋 452KB)
docs/
  QUOTE_VIEWER_PRD.md          # SSOT
  MVP PRD 양식.md              # PRD 작성 양식
  HOOKS_PLANNING.md            # Slack/Hook 시스템 설계
  archive/                     # 이전(블로그) 도메인 자산 보존
```

**견적서 라우트**

```
app/q/[slug]/page.tsx          # ✅ T1.5 — 견적서 열람 셸 (정적 셸 + Suspense resolver + generateMetadata noindex)
app/q/[slug]/quote-data.tsx    # ✅ T1.5/T1.6 — "use cache" 데이터 컴포넌트 (getQuoteBySlug→notFound → <QuoteView>)
app/q/[slug]/quote-skeleton.tsx# ✅ T1.5 — Suspense fallback 로딩 스켈레톤
proxy.ts                       # ✅ T1.5/W3 — /q/*·/admin/* 응답에 X-Robots-Tag noindex + /admin 미인증 게이트(구 middleware.ts)
lib/quotes.ts                  # ✅ T1.2/T1.3/W3 — Notion 페치 (server-only + databases.retrieve→dataSources.query, queryPublishedQuotes)
lib/pdf-browser.ts             # ✅ T2.1/T2.3 — puppeteer launch 환경 분기(로컬 Chrome vs @sparticuz). server-only 미import(spike 공유)
app/q/[slug]/pdf/route.ts      # ✅ T2.3 — 헤드리스 Chromium PDF 생성 (print:hidden, RFC5987 한글 파일명)
app/api/revalidate/route.ts    # ✅ T2.4 — on-demand revalidate webhook (Bearer 인증, timingSafeEqual)
public/robots.txt              # ✅ T2.5/W3 — Disallow: /q/·/admin (헤더/meta noindex 는 proxy.ts·page.tsx)
```

**관리자 라우트 (W3 / v1.x 고도화)**

```
proxy.ts                       # ✅ T3.1 — /admin/:path* 게이트(미인증 → /admin/login redirect, /admin/login·logout 공개 예외) + noindex
lib/admin-session.ts           # ✅ T3.1 — Web Crypto HMAC 세션 sign/verifySession (Edge·Node 공유, server-only 미적용 — R13)
lib/admin-auth.ts              # ✅ T3.1 — server-only: verifyPassword(timingSafeEqual)·createSessionToken·getAdminSession·requireAdminSession(2중검증)·set/clearSessionCookie
app/admin/login/page.tsx       # ✅ T3.1 — 로그인 셸 + Suspense resolver(이미 로그인 시 /admin redirect)
app/admin/login/actions.ts     # ✅ T3.1 — "use server" 로그인 Server Action (verifyPassword → 쿠키 set → /admin)
app/admin/login/login-form.tsx # ✅ T3.1 — "use client" useActionState 폼
app/admin/logout/route.ts      # ✅ T3.1 — GET 로그아웃(쿠키 삭제 → /admin/login)
app/admin/page.tsx             # ✅ T3.3 — 셸 + Suspense(requireAdminSession 2중검증 → queryPublishedQuotes → 목록). /admin ◐
components/admin/quote-list.tsx# ✅ T3.3 — 발행 견적 목록(데스크톱 표 ↔ 모바일 카드), [열람]·[복사]
components/admin/copy-link-button.tsx # ✅ T3.4 — "use client" navigator.clipboard + sonner toast
```

> ⚠️ **관리자 화면 보안 규칙(R11)**: `/admin` 은 인증 게이트 뒤다. proxy 1차 차단 + 서버 컴포넌트 `requireAdminSession()` 2중검증을 **데이터 페치 전에** 수행해 미인증 시 견적 목록(=비밀 slug)이 응답에 절대 포함되지 않게 한다. `/admin`·`/admin/login` 도 동적 데이터(cookies)는 `<Suspense>` 안에서만 접근(R15, Cache Components 게이트).

**레이아웃 계층**
```
RootLayout (ThemeProvider · Header · main · Footer · Toaster)
```

단일 루트 레이아웃만 사용. 별도 그룹 레이아웃은 없다.

> **폼 컴포넌트 분리 패턴** — 페이지 폼·복잡한 인터랙티브 블록은 `components/<feature>-form.tsx` 또는 `components/<feature>-view.tsx` 로 분리한다(예: `components/quote-view.tsx`). `app/.../page.tsx` 는 얇은 서버 컴포넌트 래퍼로 유지.

## 주요 패턴

- **컴포넌트 변형** — `class-variance-authority`(CVA)로 `variant`/`size`. `components/ui/button.tsx`가 레퍼런스. `@base-ui/react` primitive 를 감싸며 `ButtonPrimitive.Props` 를 확장한다.
- **className 병합** — 무조건 `cn()`. Tailwind 충돌 해결.
- **클라이언트 컴포넌트** — 브라우저 API·훅이 필요할 때만 `"use client"`. 현재: `ThemeProvider`·`ThemeToggle`·`Toaster`·`Field`/`Separator`(@base-ui/react primitive) + W3 의 `LoginForm`(useActionState)·`CopyLinkButton`(navigator.clipboard). 표시 전용 컴포넌트(`QuoteView`·`AdminQuoteList`)는 서버 컴포넌트로 유지.
- **Cache Components / ISR** — `"use cache"` + `cacheLife("minutes")` 패턴으로 ISR 을 표현한다. lib 모듈 자체에는 캐시 지시자를 두지 않고, 호출부(페이지)에서 캐시 범위를 지정한다. 견적 단건 캐시 태그는 `quote:${slug}` 규칙으로 통일.
- **동적 라우트 + Suspense** — `[slug]` 라우트는 "정적 셸 + Suspense 안의 데이터 컴포넌트" 구조로 작성한다. 그렇지 않으면 `Uncached data was accessed outside of <Suspense>` 빌드 에러가 난다.
- **Notion 페치 레이어** — 서버 전용. `NOTION_TOKEN` 노출 위험이 있으므로 클라이언트 컴포넌트에서 직접 import 금지. 첫 줄 `import "server-only"` 필수.

## 테스트 정책

전통적 러너는 없지만 작업 유형별로 다음 검증을 **DoD의 일부로** 요구한다.

- **API 연동 / 비즈니스 로직** (`lib/quotes.ts`, `app/api/*/route.ts`, 데이터 변환·합계 계산·캐시 무효화) — 정상 흐름 + 실패/에러 경로(401·외부 API 에러·빈 응답·타임아웃·중복 slug) + 엣지 케이스(경계값·만료 견적·컬럼 약속 위반 등) **최소 3종 시나리오** 명시. 위치는 `scripts/test/<name>.ts`, 실행은 `tsx`(devDep). `scripts/test/notion-client.ts` 가 레퍼런스 패턴 — 시나리오별 함수 + `=== 결과 요약 ===` 출력 + `process.exitCode`. `server-only` 모듈은 직접 import 금지(가드 throw).
- **UI / 사용자 인터랙션 / 페이지 흐름** — **Playwright MCP** 로 E2E 실측. 주요 호출:
  - `mcp__playwright__browser_navigate` — 페이지 이동
  - `mcp__playwright__browser_snapshot` — ARIA 트리 기반 상태 확인 (셀렉터보다 우선)
  - `mcp__playwright__browser_click` / `browser_fill_form` / `browser_type` — 인터랙션
  - `mcp__playwright__browser_network_request` — Route Handler·API 응답 검증 (`/q/[slug]/pdf` 파일 응답, `/api/revalidate` Bearer 인증 등)
  - `mcp__playwright__browser_take_screenshot` — 모바일 반응형·다크모드·시각 회귀
  - `mcp__playwright__browser_console_messages` — 클라이언트 에러 감지
- **회귀 방지** — 버그 수정 시 해당 버그를 재현하는 테스트를 먼저 작성한 뒤 수정한다.
- **회귀 검증용 시드 견적** — W2 에 최소 2건의 시드 견적(`[regression-seed-*]` 접두) 을 Notion 에 등록한다. Playwright 시나리오는 이 시드를 우선 사용.

> 신규 로드맵·기능을 짤 때는 `prd-roadmap-architect` 서브에이전트를 사용한다. 이 에이전트는 모든 작업 항목에 위 정책에 맞춘 "테스트 계획" 블록을 자동으로 포함시킨다.

## 스타일링

- 색상 토큰: `app/globals.css`의 CSS 변수(`--background`, `--primary` 등). **oklch** 색공간.
- 다크모드: `.dark` 클래스 토글 — `@custom-variant dark (&:is(.dark *))`.
- 테마 색 변경 → `globals.css`의 `:root` / `.dark` 블록.
- 클래스 정렬: `prettier-plugin-tailwindcss` 자동.

## 환경 변수 & 경로

- `.env.local`에 실제 값 (`.env.example` 참고). 클라이언트 노출 변수는 `NEXT_PUBLIC_` 접두사 필수.
- **Notion 환경변수**: `NOTION_TOKEN`(Integration secret, `ntn_` 또는 `secret_` 접두) + `NOTION_DATABASE_ID`(Invoice DB 32자 hex) + `NOTION_ITEMS_DATABASE_ID`(Items DB 32자 hex). 세 값이 없으면 `lib/quotes.ts` 모듈 로드 시점에 `requireEnv` 가 throw → 빌드·dev 부팅 즉시 실패하도록 작성할 것. 토큰 발급 후 **Invoice DB 와 Items DB 두 페이지 모두** 우상단 `···` → `연결`(Connections) 메뉴에서 Integration 을 **명시적으로 connect** 해야 한다(Integration 자체 권한 부여는 API 로 불가능, 한쪽만 connect 시 항목 페치가 ObjectNotFound).
- **Revalidate Secret**: `NOTION_REVALIDATE_SECRET` — `/api/revalidate` Bearer 인증용 (W2). 32자 이상 강한 무작위 권장 (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- **관리자 인증 (W3 / T3.1, 서버 전용 — `NEXT_PUBLIC_` 금지)**: `ADMIN_PASSWORD`(`/admin/login` 비밀번호 평문) + `ADMIN_SESSION_SECRET`(세션 쿠키 HMAC 서명 키, 32자+ 무작위 hex). ⚠️ `lib/admin-auth.ts` 의 `requireAdminSecret()` 가 `ADMIN_SESSION_SECRET` 미설정 시 throw → `/admin/login` 진입 시 전역 에러 경계로 떨어진다. **production(Vercel)·로컬(`.env.local`) 양쪽에 반드시 등록.** ⚠️ `ADMIN_SESSION_SECRET` 은 한 번 정하면 변경 금지(바꾸면 기존 세션 전부 무효화). 세션 만료=30일(`lib/admin-session.ts` 상수).
- **시드 슬러그**: `SEED_SLUG_ACTIVE` / `SEED_SLUG_EXPIRED` — `scripts/test/quotes-*.ts` 가 실 Notion 페치 시나리오에서 참조. T1.1 셋업 시 운영자가 Invoice DB 시드 행의 Formula slug 값을 복사해 채움. 상세 절차: `docs/SETUP_NOTION.md`.
- 새 Notion DB는 API 로 자동 생성 가능하지만, 본 MVP 의 Invoice / Items DB 는 운영자가 Notion UI 에서 수동 생성 (Slug 가 Formula 타입 + Items 의 Invoice 가 Relation 타입이라 UI 입력이 안전).
- **운영자 결정 기록** (2026-05-17 확정, 2026-05-20 실측 보강):
  - DB 구조 = **Invoice + Items 2개 DB 분리** (PRD 자가검증 3번의 대안). ✅ 실측 확인 — `data_source_id`: Invoice `36378466-f727-809a-95e1-000bb090aee6`, Items `36378466-f727-80cf-a93a-000b7cc5a3be`.
  - Items → Invoice 관계 = **Relation 일대다** (Items DB 에 `견적` 속성, Show on 견적 양방향)
  - Slug = Notion `Formula` (`replaceAll(id(), "-", "")` → 32자 hex)
  - 부가세 기본값 = 10%
  - 총 금액 Notion 표시 = **옵션 B 채택**: Items 에 `금액`(Formula `수량 * 단가`) + Invoice 에 `총금액`(Rollup Items→`금액`→Sum). **운영자 UI 표시용 only — 코드는 무시하고 자체 계산** (SSOT 보존)
  - `ClientContact` 제외 (Future) — 실측상 Invoice DB 에 해당 속성 부재
  - 도메인 명칭: DB 이름만 영문, 프로젝트·라우트(/q/[slug])·UI 텍스트·코드 식별자(`getQuoteBySlug`)는 "견적서" 유지
  - **⚠ 속성명·상태값 한글 — Path B 매핑 (2026-05-20 확정)**: 운영자가 두 DB 의 모든 속성·상태 옵션을 **한글로 생성**. Notion 은 한글 유지하고 `lib/quotes.ts` 의 `PROP`/`STATUS` 매핑 상수로 코드 도메인(영문)과 변환. 영문 키 하드코딩 금지. 상태 옵션 = `[초안, 발행, 보관]` → `[Draft, Published, Archived]`. 도메인 모델 표 첫 열이 실제 Notion 키.
  - ⚠ `상태` 게이트 필터는 `dataSources.query` 에 `filter: { property: "상태", select: { equals: "발행" } }` (영문 `Status`/`Published` 아님).
  - ⚠ **Slug formula 는 서버 필터 불가 (2026-05-20 실측, requestId 3건 확인)**: `슬러그` 는 `replaceAll(id(), "-", "")` formula 인데, Notion 필터 엔진이 출력 타입을 결정하지 못해 `formula: { string: { equals } }` · `rich_text: { equals }` · AND 조합 **모두 `validation_error: Unable to filter based on a formula of unknown type`** 로 실패한다. (페이지 응답에서는 `formula.type === "string"` 으로 정상.) → `getQuoteBySlug` 는 **`상태=발행` 으로만 query(`start_cursor` 페이지네이션) → 코드에서 `getFormulaString(슬러그) === slug` 비교 → 0건 null·2건 이상 throw(중복)** 로 구현돼 있다. 발행 견적 수가 적은 MVP 규모에서 충분.
  - ⚠ Items 페치는 `dataSources.query` 에 `filter: { property: "견적", relation: { contains: invoiceId } }` + `sorts: [{ timestamp: "created_time", direction: "ascending" }]`.
  - ⚠ `lib/quotes.ts::normalizeQuote` 는 Notion 의 `총금액`(Rollup) / `금액`(Formula) 컬럼을 **읽지 말 것**. 항상 `Σ(수량 × 단가) → Math.round(... × 부가세율/100)` 자체 계산.
- 경로 alias: `@/*` → 프로젝트 루트 (`tsconfig.json`).

## 프로젝트 컨텍스트 문서

- `docs/QUOTE_VIEWER_PRD.md` — **단일 출처(SSOT)**. Overview / Persona / Use Cases / 기능 명세서(P0·Future) / IA / DataTable / 기술 결정 / 정합성 규칙. 새 기능 추가·범위 결정 전 반드시 참고.
- `docs/ROADMAP.md` — W1~W3 태스크 실행 계획(`T<주차>.<번호>` ID). 각 태스크의 산출물·DoD·**테스트 계획**·의존성·리스크. 작업 시작 전 해당 태스크 ID 섹션 우선 확인. **Phase 3(W3) = v1.x 고도화**(운영자 관리 화면 — T3.1 인증→T3.2 목록 페치→T3.3 `/admin` 목록→T3.4 링크 복사→T3.5 다크모드 검증, PRD 부록 A 기반, 2026-05-22 추가). **Phase 4(Future)** = PRD Future 항목 임팩트-노력 매트릭스.
- `docs/MVP PRD 양식.md` — PRD 작성 양식 (다음 견적서 외 PRD 작성 시 참고).
- `docs/HOOKS_PLANNING.md` — Slack 알림 시스템 설계·이슈·로드맵 기획서. **Slack/Hook 관련 변경 시 반드시 참조**.
- `docs/archive/` — 블로그 MVP 시절 자산 보존(2026-05-17 이전). `NOTION_BLOG_PRD.md`, `ROADMAP.md`(블로그 버전), `BUG_REPORT.md`, `shrimp-rules.md`, `shrimp-backup/`.
- `README.md` — 외부 독자용 프로젝트 소개.

## Claude Code 통합 환경

저장소 동봉 자산:

- `.claude/agents/` — 서브에이전트 정의. 현재 6종:
  - `code-reviewer-kr` — 코드 구현 완료 시 자동 호출 권장. 한국어 리뷰.
  - `qa-engineer` — TC 설계·테스트 작성·버그 분석.
  - `reverse-planner` — 코드 작성 후 역기획서 자동 생성.
  - `prd-generator-kr` — MVP PRD 문서 작성.
  - `prd-roadmap-architect` — PRD → `docs/ROADMAP.md` 변환. 각 작업에 테스트 계획(Playwright MCP 포함) 자동 포함.
  - `nextjs-starter-optimizer` — 스타터킷 정리·최적화 (현재 단계에서는 거의 사용 불필요).
- `.claude/agent-memory/<agent>/` — 서브에이전트별 메모리 저장소.
- `.claude/commands/git/` — 커스텀 슬래시 명령 (`/git:commit`, `/git:explain`).
- `.claude/output-styles/beginner.md` — 초보자용 출력 스타일.
- `.claude/settings.json` — 프로젝트 공유 Hook 설정 (현재 Bash PreToolUse 테스트 훅 → `hook-test.txt`에 로그 append).
- `.claude/slack-notify.ps1` — Windows PowerShell. 권한 요청 / 작업 완료 / 서브에이전트 이벤트를 Slack 에 전달. UTF-8 BOM 인코딩 사용(한글 깨짐 방지).
- `.claude/statusline-command.sh` / `.claude/statusline-command.ps1` — 크로스플랫폼 statusline 스크립트(macOS·Linux / Windows). 대화 컨텍스트 기반으로 하단 상태바를 그린다. **statusline 동작 수정 시 두 파일을 동시에 맞춰야 함**.
- `.mcp.json` — MCP 서버 설정. 등록 서버:
  - `context7` — 라이브러리 문서 조회 (Next.js·Tailwind 등 최신 API 확인 시 우선 사용).
  - `sequential-thinking` — 단계적 사고.
  - `playwright` — 브라우저 자동화. **테스트 정책의 E2E 검증 기본 도구**.
  - `shadcn` — shadcn/ui 레지스트리 검색·추가.
  - `shrimp-task-manager` — Shrimp 기반 태스크 분해·실행·검증 체인. 로컬 빌드(`E:/claude/mcp-shrimp-task-manager/dist/index.js`), `DATA_DIR=.shrimp/`(gitignored). 견적서 도메인 태스크 분해 시 W1 부터 재가동.
- `hook-test.txt` (저장소 루트) — Bash PreToolUse 훅이 append 하는 로그. 수동 편집 금지.

`.claude/settings.local.json` 은 `.gitignore` 처리. Claude Code 가 자동 추가하는 permission 룰에 webhook URL 같은 민감값이 섞일 수 있어 의도적으로 untrack.
