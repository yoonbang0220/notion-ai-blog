# ROADMAP — 노션 기반 견적서 웹뷰어 + PDF 다운로드 MVP

> 최종 업데이트: 2026-05-17 | 기반 문서: `docs/QUOTE_VIEWER_PRD.md`
> 도메인: 견적서 뷰어 (이전 블로그 도메인은 `docs/archive/` 에 보존)

## 📌 요약

- **비전 한 줄**: 운영자는 Notion에 한 번 쓰고, 클라이언트는 링크 한 번에 열람하고 PDF 한 번에 결재 올린다.
- **목표 출시 시점**: W2 종료 시점(파트타임 2주). PRD 일정 표 기준 W1+W2 완료 직후 데모 링크 공유 가능.
- **핵심 KPI**:
  - 운영자: 견적 1건 발행 → 공유 URL 전달까지 **5분 이내**.
  - 클라이언트: URL 클릭 → 견적서 첫 페인트 **3초 이내(3G 모바일 기준)**, PDF 다운로드 클릭 → 파일 수신 **10초 이내(콜드스타트 포함)**.
  - 정합성: 동일 URL의 견적 수정 → **60초 이내 반영(webhook 시) / 5분 이내 반영(자연 캐시 만료 시)**.

## 🎯 전체 단계 개요

| Phase | 목표 | 기간(추정) | 핵심 산출물 |
|-------|------|-----------|------------|
| Phase 0 (W0) | 도메인 전환 초기화 | 완료 | 블로그 자산 `docs/archive/` 이동, 새 `CLAUDE.md`, `/` 플레이스홀더, shadcn 7종 유지 |
| Phase 1 (W1) | Notion `Quotes` 페치 + `/q/[slug]` 렌더 + 항목 표 파싱 + 합계 계산 | 파트타임 1주 (실작업 ~25h) | `lib/quotes.ts`, `app/q/[slug]/page.tsx`, `components/quote-view.tsx`, `scripts/test/quotes-client.ts` |
| Phase 2 (W2) | PDF 라우트 + on-demand revalidate webhook + robots/noindex + Playwright E2E | 파트타임 1주 (실작업 ~25h) | `app/q/[slug]/pdf/route.ts`, `app/api/revalidate/route.ts`, `public/robots.txt`, 시드 견적 2건, E2E 회귀 리포트 |
| Phase 3 (Future) | 10항목 우선순위 매트릭스 정렬 | 트리거 조건 발생 시 | 비밀번호 보호·자동 차단·열람 알림 등 (구현 보류) |

> 📌 가정: 운영자 1인 파트타임. 실작업 시간은 캘린더 데이가 아닌 **"코드를 작성·검증하는 순수 시간"** 기준. 회의·디자인 검토·문서화 제외. 외부 의존성(Vercel/Notion 정상 동작)은 가용하다고 가정.

---

## Phase 0 (W0): 도메인 전환 초기화 — 완료

### 목표

스타터킷 + 블로그 도메인 코드를 견적서 도메인으로 깔끔히 전환하고, 신규 작업이 시작될 수 있는 백지 상태를 만든다.

### 완료 항목 (참고용)

- ✅ 블로그 PRD/ROADMAP/Shrimp 태스크 → `docs/archive/` 로 이동.
- ✅ `app/posts`, `app/category`, `app/tag`, `app/about` 라우트 제거. `/`, `/not-found` 만 유지.
- ✅ `lib/notion.ts` 제거 (W1 에서 `lib/quotes.ts` 신규 작성).
- ✅ `CLAUDE.md` 견적서 도메인 기준 전면 재작성.
- ✅ shadcn/ui 7종(button·card·field·input·label·separator·sonner), `components/common/*`(Header·Footer·ThemeProvider·ThemeToggle) 유지.
- ✅ `scripts/test/notion-client.ts` 보존 — `databases.retrieve → dataSources.query` 2단계 패턴 인라인 복제 레퍼런스로 활용.
- ✅ `next.config.ts` `images.remotePatterns` 3종 Notion 호스트 등록 유지.

### Phase 0 DoD (이미 충족)

- 빌드 통과 (`npm run build`), lint 무경고 (`npm run lint`).
- `/` 플레이스홀더가 견적서 도메인 안내 문구로 렌더.
- 블로그 잔재(라우트·페치 레이어·타입) 없음.

---

## Phase 1 (W1): 데이터 페치 + 견적서 렌더

### 목표

운영자가 Notion `Quotes` DB에 행을 추가하고 `Status=Published` 로 바꾸면, `/q/[slug]` 에서 견적서가 깔끔하게 렌더되고 항목·합계가 자동 계산된다. 모바일에서도 표가 깨지지 않는다.

### 작업 항목

#### ✅ T1.1 — Notion `Quotes` DB 스키마 정의 및 시드 1건 입력

- **추정**: M (0.5~1d) · **담당 영역**: data / ops · **테스트**: 수동 체크리스트
- **세부 단계**:
  1. Notion 워크스페이스에 `Quotes` Database 생성. 속성 11종 정의(PRD DataTable 절 참고):
     - `Title`(title), `Slug`(text, unique), `Status`(select: Draft/Published/Archived), `ClientCompany`(text), `ClientContact`(text), `IssuerCompany`(text), `QuoteNumber`(text), `IssuedAt`(date), `ValidUntil`(date), `TaxRate`(number, default 10), `Notes`(text, multi-line).
     - v5 SDK 트랩: `databases.create` 의 `properties` 인자는 무시됨 → DB 생성 후 `dataSources.update({data_source_id, properties: {...}})` 로 속성 정의해야 한다. 본 태스크는 Notion UI 에서 수동 생성으로 우회(운영자 시점에선 UI가 더 쉬움).
  2. Integration `connect` (Notion 페이지 우상단 `···` → `Connections`).
  3. 정상 시드 견적 1건 입력: 표는 page body 첫 `table` 블록에 `[항목명, 수량, 단가, 비고]` 4열 컬럼으로 작성. 슬러그는 nanoid(32자) 수동 입력(`regression-seed-active`로 시작하지 않게 진짜 추측 불가 값 사용; 식별용 별칭은 `Title` 에 `[regression-seed-active]` 접두).
  4. `.env.local` 에 `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `REVALIDATE_SECRET`(W2 에서 사용) 채움.
- **인수 조건**:
  - Notion `Quotes` DB의 모든 속성이 PRD DataTable과 1:1 매핑.
  - `Status=Published` 시드 견적이 Integration 권한으로 페치 가능(다음 태스크에서 검증).
- **의존성**: 없음
- **테스트 계획**:
  - 검증 도구: 수동 + W1.2 단위 테스트로 간접 확인.
  - 체크리스트:
    1. Notion UI에서 시드 견적이 보이고, Integration 이 명시적으로 connect 되어 있다.
    2. `.env.local` 의 `NOTION_TOKEN` 이 `ntn_` 또는 `secret_` 접두, `NOTION_DATABASE_ID` 가 32자 hex.
- **함정·메모**: ⚠️ Integration connect 는 API 로 자동화 불가능 — 운영자가 Notion UI 에서 직접 수행해야 함. 누락 시 모든 페치가 `ObjectNotFound` 로 실패.

#### ✅ T1.2 — `lib/quotes.ts` 페치 레이어 (`getQuoteBySlug`)

- **추정**: L (1~2d) · **담당 영역**: data · **테스트**: 단위 + 통합 (`scripts/test/quotes-client.ts`)
- **세부 단계**:
  1. `lib/quotes.ts` 신규 작성. 첫 줄 `import "server-only"`. `requireEnv("NOTION_TOKEN")` / `requireEnv("NOTION_DATABASE_ID")` 헬퍼.
  2. `Client` 인스턴스 + `resolveDataSourceId()` (모듈 로드 후 1회 캐시): `databases.retrieve({database_id})` → `data_sources[0].id`.
  3. `getQuoteBySlug(slug: string): Promise<Quote | null>`:
     - 슬러그 형식 검증 (`/^[A-Za-z0-9_-]{32,}$/`) — 위반 시 즉시 `null` 반환 (404 처리).
     - `dataSources.query({ data_source_id, filter: { and: [ {property: "Status", select: {equals: "Published"}}, {property: "Slug", rich_text: {equals: slug}} ] }, page_size: 2 })`.
     - 결과 2건 이상 → `throw new Error("Duplicate slug: ${slug}")` (PRD 정합성 규칙 1).
     - 결과 0건 → `null`.
     - 1건 → Notion 속성을 TS `Quote` 타입으로 정규화(`title`, `slug`, `status`, `clientCompany`, `clientContact`, `issuerCompany`, `quoteNumber`, `issuedAt`, `validUntil`, `taxRate`, `notes`).
     - 필수 속성(`title` / `slug` / `status` / `issuerCompany` / `clientCompany`) 누락 → `console.warn` + 해당 필드 `null` 채움 (전체 throw 금지, PRD 정합성 규칙 2).
  4. `types/index.ts` 신규 작성 — `Quote`, `QuoteItem` 인터페이스 (PRD DataTable 기준).
- **인수 조건**:
  - 정상 시드 견적 조회 → `Quote` 객체 반환, 모든 필드 채워짐.
  - 잘못된 슬러그(32자 미만, 특수문자 포함) → `null`.
  - Notion 401 → `APIResponseError` throw, 호출부에서 처리 가능.
  - 빈 결과(슬러그 미존재) → `null` (throw 금지).
  - 중복 slug → throw.
- **의존성**: T1.1
- **테스트 계획** — `scripts/test/quotes-client.ts` (인라인 복제 패턴, `npm run test:quotes` 스크립트 추가):
  - **시나리오 1 (정상)**: 시드 견적 슬러그로 페치 → 결과 1건, 필수 5속성 모두 not-null.
  - **시나리오 2 (실패: 인증)**: 잘못된 `NOTION_TOKEN` → `APIErrorCode.Unauthorized` throw 캐치.
  - **시나리오 3 (실패: 빈 결과)**: 존재하지 않는 슬러그 → `null` 반환, throw 없음.
  - **시나리오 4 (엣지: 슬러그 형식)**: `"too-short"` 입력 → `null` (Notion 호출 자체가 발생하지 않아야 함, fetch 카운트 0 확인).
  - **시나리오 5 (엣지: 중복 slug)**: 동일 슬러그 2건 시드 → throw (시드 생성·삭제는 스크립트 내 setup/teardown).
  - 모든 시나리오에 `=== 결과 요약 ===` 출력 + `process.exitCode = 0/1`. 레퍼런스: `scripts/test/notion-client.ts`.
  - ⚠️ `lib/quotes.ts` 직접 import 금지 — `server-only` 가드가 Node 환경에서 throw. v5 SDK 만 직접 호출하는 인라인 복제로 동치성 확보.
- **함정·메모**:
  - ⚠️ `@notionhq/client` v5: `databases.query` 제거됨 → `databases.retrieve` → `dataSources.query` 2단계 필수.
  - ⚠️ `NOTION_TOKEN` 서버 전용. `NEXT_PUBLIC_` 절대 금지.
  - ⚠️ Notion `rich_text` 는 배열 → `.map(t => t.plain_text).join("")` 패턴.

#### ✅ T1.3 — 항목 표 파싱 + 합계 계산 (`getQuoteItems`)

- **추정**: M (0.5~1d) · **담당 영역**: data / 비즈니스 로직 · **테스트**: 단위 (`scripts/test/quotes-items.ts`)
- **세부 단계**:
  1. `lib/quotes.ts` 에 `getQuoteItems(pageId: string): Promise<{ items: QuoteItem[]; warning: string | null }>` 추가.
  2. `blocks.children.list({block_id: pageId})` 로 page body 블록 페치.
  3. 첫 번째 `table` 블록을 찾는다. 없으면 `{items: [], warning: "표 블록을 찾을 수 없습니다."}` 반환.
  4. 해당 table 블록의 `children`(table_row) 페치. 첫 행은 헤더로 간주.
  5. 컬럼 약속 검증: 헤더가 정확히 `["항목명", "수량", "단가"]` 또는 `["항목명", "수량", "단가", "비고"]` 인지 확인. 위반 시 `{items: [], warning: "표 컬럼 약속 위반: 헤더는 [항목명, 수량, 단가, (비고)] 이어야 합니다."}` 반환 (PRD 정합성 규칙 4).
  6. 데이터 행을 `QuoteItem[]` 으로 변환. 수량·단가는 `parseInt` 후 NaN 시 0. 행별 `amount = quantity * unitPrice`.
  7. `calculateTotals(items, taxRate)`: `subtotal = Σ amount`, `tax = Math.round(subtotal * taxRate / 100)`, `total = subtotal + tax`. 모두 정수 원 단위 (PRD 정합성 규칙 6).
- **인수 조건**:
  - 정상 시드 견적의 항목 표를 정확히 파싱, 행별 amount 와 합계 일치.
  - 헤더 다른 표 → 빈 배열 + warning 메시지.
  - 표 자체가 없는 페이지 → 빈 배열 + warning.
  - 부가세율 0 → `tax = 0`, 결과에서 부가세 행 숨김 가능.
  - 부가세율 10 → 정수 반올림.
- **의존성**: T1.2
- **테스트 계획** — `scripts/test/quotes-items.ts`:
  - **시나리오 1 (정상)**: 시드 견적의 page body 표 파싱 → 행 수·금액 일치, warning null.
  - **시나리오 2 (실패: 표 없음)**: 빈 page body 가진 임시 시드 → `{items: [], warning: /표 블록을 찾을 수 없습니다/}`.
  - **시나리오 3 (엣지: 헤더 위반)**: 헤더가 `["품목", "Q", "P"]` 인 임시 시드 → `{items: [], warning: /표 컬럼 약속 위반/}`.
  - **시나리오 4 (엣지: 수량/단가 비어있음)**: 수량 셀이 빈 행 → `quantity = 0`, `amount = 0`, throw 없음.
  - **시나리오 5 (엣지: 부가세 0%)**: `taxRate=0` → `tax = 0`, `total = subtotal`.
  - **시나리오 6 (엣지: 반올림)**: `subtotal=1234567`, `taxRate=10` → `tax = 123457` (정수 반올림 확인).
- **함정·메모**:
  - Notion table 블록은 `has_children=true` 이며 `children` 로 한 번 더 페치해야 row 들을 얻을 수 있다.
  - 셀 내용은 `cells: rich_text[][]` 이중 배열 — `cells[colIdx].map(t => t.plain_text).join("")` 으로 평탄화.

#### ✅ T1.4 — 견적서 도메인 타입 + 정규화 헬퍼

- **추정**: S (<2h) · **담당 영역**: data · **테스트**: 단위 (T1.2/T1.3 에 통합)
- **세부 단계**:
  1. `types/index.ts` 에 `Quote`, `QuoteItem`, `QuoteTotals`, `QuoteStatus` 타입 정의.
  2. `lib/quotes.ts` 에 `normalizeQuote(page: PageObjectResponse): Quote` 헬퍼 분리 → T1.2 에서 호출.
  3. JSDoc 으로 각 필드의 Notion 속성 매핑 명시.
- **인수 조건**: `Quote` 타입이 PRD DataTable의 11속성 + derived 3종(`subtotal/tax/total`) 모두 표현. `tsc` 오류 0.
- **의존성**: T1.2 (병행 가능)
- **테스트 계획**: T1.2 시나리오 1에서 모든 필드 not-null 검증으로 흡수. 별도 스크립트 불필요.
- **함정·메모**: 타입은 `@notionhq/client/build/src/api-endpoints` 의 `PageObjectResponse` 와 호환되도록 작성.

#### ✅ T1.5 — `/q/[slug]` 페이지 셸 + Suspense 데이터 컴포넌트

- **추정**: M (0.5~1d) · **담당 영역**: ui · **테스트**: 빌드 + 수동 + Playwright E2E (T2.6 에서 본격 검증)
- **세부 단계**:
  1. `app/q/[slug]/page.tsx` 생성. `params: Promise<{slug: string}>` await.
  2. 페이지 구조: 정적 셸(헤더·로고 영역) + `<Suspense fallback={<QuoteSkeleton />}>` 안에 `<QuoteData slug={slug} />` 배치.
  3. `<QuoteData>` 는 별도 서버 컴포넌트로 분리. 첫 줄 `"use cache"` + `cacheLife("minutes")` + `cacheTag(`quote:${slug}`)`. `getQuoteBySlug(slug)` 호출 → `null` 이면 `notFound()`.
  4. 응답 헤더에 `X-Robots-Tag: noindex, nofollow` 강제 (PRD 정합성 규칙 5). Next.js 16 에서는 `headers()` 또는 metadata API 활용.
- **인수 조건**:
  - 시드 견적 슬러그로 접속 → 셸이 먼저 보이고, 데이터 영역이 streaming으로 채워짐.
  - 잘못된 슬러그 → 404 페이지(`app/not-found.tsx`) 렌더.
  - 응답 헤더에 `x-robots-tag: noindex, nofollow` 포함 (curl 또는 Playwright 로 검증).
  - `npm run build` 통과 — Cache Components 의 `Uncached data was accessed outside of <Suspense>` 에러 없음.
- **의존성**: T1.2, T1.3, T1.4
- **테스트 계획**:
  - 빌드 검증: `npm run build` → 에러 없음.
  - 수동: 로컬 `npm run dev` 에서 시드 슬러그·잘못된 슬러그·미공개 슬러그 3종 접속.
  - Playwright (T2.6 에서 본격): `browser_navigate('/q/<seed-slug>')` → `browser_snapshot()` 으로 견적 헤더·발행자·고객사 텍스트 확인.
- **함정·메모**:
  - ⚠️ Next.js 16: `params` Promise → `await`. 동적 라우트의 데이터 페치는 **반드시 `<Suspense>` 안에 두어야** 빌드 통과 (Cache Components 규칙).
  - ⚠️ `"use cache"` + `cacheLife("minutes")` 사용. `export const revalidate = N` 금지.
  - ⚠️ 응답 헤더 강제는 Next.js 16 권장 패턴 확인 필요 (Route Handler + Middleware vs Page response). Middleware 가 가장 안정적.

#### ✅ T1.6 — `<QuoteView>` 컴포넌트 (데스크톱 + 모바일 반응형)

- **추정**: L (1~2d) · **담당 영역**: ui · **테스트**: 수동 + Playwright (T2.6)
- **세부 단계**:
  1. `components/quote-view.tsx` 신규 작성 (서버 컴포넌트). props: `quote: Quote`, `items: QuoteItem[]`, `totals: QuoteTotals`, `itemsWarning: string | null`, `isExpired: boolean`.
  2. PRD 와이어프레임 기준 레이아웃:
     - 상단: 발행자 회사명·로고(텍스트 가능)·발행일·견적번호·유효기간.
     - 받는 분: 고객사명·담당자.
     - 견적 항목 표: 데스크톱은 `<table>`, 모바일(`@media (max-width: 640px)` 또는 Tailwind `sm:` 미만)은 카드 형태(`항목명 / 수량 × 단가 = 금액`).
     - 합계 영역: 소계·부가세(taxRate=0 이면 숨김)·총합계. 정수 원 단위 + `Intl.NumberFormat("ko-KR")` 포맷.
     - 비고/결제 조건: `notes` 영역.
     - 하단 + 우상단 2곳에 "PDF 다운로드" 버튼 (T2.x 에서 동작 연결).
  3. 필수 속성 누락 경고 배너 (PRD 정합성 규칙 2): `quote.title/issuerCompany/clientCompany` 중 하나라도 null → 상단 노란색 배너 "일부 필수 정보가 누락되어 표시되지 않은 항목이 있습니다."
  4. 항목 표 컬럼 약속 위반 시(`itemsWarning != null`): 빈 표 + 상단 빨간 배너 (PRD 정합성 규칙 4).
- **인수 조건**:
  - 데스크톱(≥1024px): A4 비율에 가까운 단일 컬럼, 표가 가로 스크롤 없이 표시.
  - 모바일(<640px): 항목이 카드형으로 분해, 가로 스크롤 없음, 합계 금액 가독성 확보.
  - 합계 금액이 `1,900,000원` 형태로 표시.
  - 만료 견적은 상단에 빨간 배너 "유효기간이 만료되었습니다" + 본문은 정상 노출.
  - 다크모드에서도 표·합계 가독성 유지 (Tailwind v4 토큰 활용).
- **의존성**: T1.5
- **테스트 계획**:
  - 수동: 데스크톱/모바일/다크모드 3종 viewport 에서 시드 견적 시각 검수.
  - Playwright (T2.6 에서 본격):
    - `browser_resize(375, 667)` 후 `browser_snapshot()` → 모바일 카드 레이아웃 확인, 가로 스크롤 발생 안 함.
    - `browser_take_screenshot({fullPage: true})` 다크모드·라이트모드 베이스라인 2장.
- **함정·메모**:
  - shadcn/ui = `@base-ui/react` (Radix 아님). 표 컴포넌트는 자체 `<table>` 직접 사용 가능 (shadcn `table` 별도 추가 필요 시 `mcp__shadcn__get_add_command_for_items` 활용).
  - 한글 폰트는 W2 의 PDF 폰트 임베드와 동일하게 Pretendard 사용 → T2.3 에서 결정 후 본 컴포넌트도 동일 폰트 적용.

#### ✅ T1.7 — 만료 견적 배너 + `isExpired` 판정 로직

- **추정**: S (<2h) · **담당 영역**: data + ui · **테스트**: 단위 (T1.2 에 통합) + Playwright (T2.6)
- **세부 단계**:
  1. `lib/quotes.ts` 에 `isQuoteExpired(quote: Quote, now = new Date()): boolean` 헬퍼. `quote.validUntil < now` 면 true.
  2. `<QuoteData>` 에서 호출해 `<QuoteView isExpired={...}>` 로 전달.
  3. `<QuoteView>` 상단 배너 (T1.6 에 포함).
- **인수 조건**:
  - `validUntil < now` → 배너 노출, 본문은 정상.
  - `validUntil >= now` → 배너 미노출.
  - `validUntil = null` → 배너 미노출, 콘솔 warning 1회.
- **의존성**: T1.2, T1.6
- **테스트 계획**:
  - 단위 (`scripts/test/quotes-items.ts` 에 추가): 정상/만료/null 3 케이스에 `isQuoteExpired` 호출 → boolean 검증.
  - Playwright (T2.6): 만료 시드 견적(`regression-seed-expired`)으로 접속 → `browser_snapshot()` 에 만료 배너 텍스트 포함 확인.
- **함정·메모**: 만료여도 페이지 노출은 허용(PRD 가정). 차단은 Future(Phase 3).

### Phase 1 완료 정의 (DoD)

- [x] T1.1~T1.7 모든 작업 항목 인수 조건 통과. *(2026-05-21: T1.7 `isQuoteExpired` 구현, `test:quotes` 10/10)*
- [x] `npm run build` 통과 (Cache Components 게이트). *(2026-05-21: `/q/[slug]` Partial Prerender)*
- [x] `npm run lint` 무경고.
- [x] `npm run test:quotes` (신규 스크립트) 모든 시나리오 통과 → `=== 결과 요약 ===` 에 fail 0. *(7/7)*
- [x] 정상 시드 견적이 `/q/<slug>` 에서 데스크톱·모바일·다크모드 3종 viewport 에서 렌더 (수동 검수). *(Playwright 실측 + 수동 확인)*
- [x] 만료 시드 견적에서 배너 노출. *(만료 시드 빨간 배너 Playwright 확인)*
- [x] 잘못된 슬러그 → 404.
- [ ] 코드 리뷰 통과 (`code-reviewer-kr` 서브에이전트). *(미실행 — 잔여)*
- [ ] **정의된 테스트 시나리오가 모두 통과** (단위 스크립트 + 수동 viewport 검수). *(T1.7 단위 시나리오·코드리뷰 잔여)*

### Phase 1 리스크

- ⚠️ **R1. Notion 표 블록 API 의 children 페이지네이션** — table row 가 100개 초과 시 `start_cursor` 페이지네이션 필요. MVP 견적은 행 ≤30 가정. **완화**: T1.3 에서 `has_more` 플래그 체크 + warning. 100행 초과 시 차후 페이지네이션 추가.
- ⚠️ **R2. `cacheTag` API 시그니처** — Next.js 16 `unstable_cacheTag` vs 정식 `cacheTag` API 검증 필요. **완화**: T1.5 작업 직전 `node_modules/next/dist/docs/` 확인 + context7 으로 최신 API 조회.
- ⚠️ **R3. Notion v5 SDK 타입 변경** — `PageObjectResponse` 의 속성 접근 방식이 v4 와 다를 수 있음. **완화**: T1.2 에서 `isFullPage` 가드 사용, 타입 안전 페치.

---

## Phase 2 (W2): PDF + Revalidate + SEO 차단 + E2E

### 목표

견적서를 PDF로 다운로드 가능하게 만들고, Notion 변경이 60초 이내에 반영되며, 검색엔진 인덱싱이 차단되고, Playwright E2E로 회귀를 잡는다.

### 작업 항목

#### T2.1 — `puppeteer-core` + `@sparticuz/chromium` 설치 + 로컬/Vercel 동작 검증

- **추정**: M (0.5~1d) · **담당 영역**: infra · **테스트**: 수동 + 통합 (`scripts/test/pdf-spike.ts`)
- **세부 단계**:
  1. `npm i puppeteer-core @sparticuz/chromium` (devDeps 아님, 런타임 의존).
     - ⚠️ 풀 `puppeteer` 절대 금지 (Vercel Function 크기 초과).
  2. `scripts/test/pdf-spike.ts` 작성 — 로컬에서 `https://example.com` PDF 추출 1건 테스트. 로컬은 `puppeteer-core` 가 시스템 Chrome 을 찾도록 `executablePath` 분기.
  3. Vercel Function 환경 결정: `runtime = "nodejs"` (edge 불가). `vercel.json` 또는 라우트 옵션 `export const maxDuration = 30`, `export const runtime = "nodejs"`.
- **인수 조건**:
  - 로컬에서 `tsx scripts/test/pdf-spike.ts` → `out/spike.pdf` 생성 (>1KB).
  - Vercel preview 배포에서 동일 스크립트의 fetch 버전이 200 응답 + `Content-Type: application/pdf`.
- **의존성**: 없음 (병행 가능)
- **테스트 계획** — `scripts/test/pdf-spike.ts`:
  - **시나리오 1 (정상)**: `puppeteer.launch({executablePath: await chromium.executablePath(), args: chromium.args, headless: chromium.headless})` → `page.goto("https://example.com")` → `page.pdf({format: "A4"})` → 파일 출력 + `console.log("size:", buffer.length)`.
  - **시나리오 2 (실패: 잘못된 URL)**: `page.goto("https://nonexistent.invalid", {timeout: 5000})` → catch 후 명확한 에러 메시지.
  - **시나리오 3 (엣지: 메모리)**: `process.memoryUsage()` 출력 → Vercel 1024MB 한계 대비 여유 확인.
- **함정·메모**:
  - ⚠️ `@sparticuz/chromium` 버전과 `puppeteer-core` 버전 호환 매트릭스 확인 필수. 보통 chromium 패키지 README 명시. context7 으로 `puppeteer-core` 최신 docs 확인.
  - ⚠️ Vercel Function 메모리 1024MB 이상 권장. `vercel.json` 의 `functions: { "app/q/[slug]/pdf/route.ts": { memory: 1024 } }`.
  - 로컬 macOS/Windows 는 시스템 Chrome 경로 분기 필요.

#### T2.2 — 한글 폰트 임베드 (Pretendard 또는 Noto Sans KR)

- **추정**: S (<2h) · **담당 영역**: ui / pdf · **테스트**: 수동 + Playwright 시각 회귀 (T2.6)
- **세부 단계**:
  1. Pretendard 폰트(또는 Noto Sans KR) `.woff2` 파일을 `public/fonts/` 에 추가.
  2. `next/font/local` 로 `app/layout.tsx` 에서 임베드. `--font-pretendard` CSS 변수.
  3. `app/globals.css` 의 `@theme inline` 블록에서 `--font-sans: var(--font-pretendard), ...` 로 설정 (Tailwind v4).
  4. `<QuoteView>` 본문에 한글 텍스트 잘림·자간 검수.
- **인수 조건**:
  - 견적서 페이지의 모든 한글이 Pretendard 로 렌더 (브라우저 devtools Computed 탭 확인).
  - 모바일/데스크톱 모두 자간·줄간 깨짐 없음.
  - PDF 출력에서도 동일 폰트 적용 (T2.4 에서 검증).
- **의존성**: 없음 (T2.1 과 병행 가능)
- **테스트 계획**:
  - 수동: 시드 견적 페이지에서 devtools 로 폰트 확인.
  - Playwright (T2.6): `browser_take_screenshot()` 베이스라인 캡쳐.
- **함정·메모**:
  - 라이선스: Pretendard 는 OFL, Noto Sans KR 은 OFL. 상업 사용 가능.
  - `next/font/local` 은 빌드 시 `display: swap` 기본. PDF 인쇄 시 폰트 로드 대기를 위해 `display: "block"` 검토.

#### T2.3 — `/q/[slug]/pdf` Route Handler (헤드리스 Chromium 인쇄)

- **추정**: L (1~2d) · **담당 영역**: pdf / infra · **테스트**: 단위 + 통합 (`scripts/test/pdf-route.ts`) + Playwright (T2.6)
- **세부 단계**:
  1. `app/q/[slug]/pdf/route.ts` 생성. `export async function GET(req, {params})`.
  2. `params.slug` await → `getQuoteBySlug(slug)` 호출 → null 이면 404.
  3. 자체 도메인 URL 구성: `const url = new URL(`/q/${slug}?print=1`, req.nextUrl.origin)`.
  4. `puppeteer-core` + `@sparticuz/chromium` 으로 브라우저 launch → `page.goto(url, {waitUntil: "networkidle0"})` → `page.pdf({format: "A4", printBackground: true, margin: {top: "10mm", bottom: "10mm", left: "10mm", right: "10mm"}})`.
  5. `<QuoteView>` 에 `print=1` 쿼리 분기 추가 (T1.6 보강): PDF 다운로드 버튼·헤더·푸터 숨김, 인쇄 전용 CSS 적용.
  6. 응답: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(견적서_<clientCompany>_<YYYYMMDD>.pdf)}` (RFC 5987 한글 파일명).
  7. 실패 시(브라우저 launch 실패·timeout) 500 + 명확한 에러 메시지.
- **인수 조건**:
  - 시드 견적 슬러그로 `/q/<slug>/pdf` 호출 → A4 1~2장 PDF 다운로드, 한글 폰트 정상 렌더.
  - 파일명이 `견적서_ABC주식회사_20260517.pdf` 형태 (브라우저별 다운로드 표시 확인).
  - 잘못된 슬러그 → 404.
  - 로컬 환경에서도 시스템 Chrome 으로 동작 (분기 처리).
- **의존성**: T2.1, T2.2, T1.5, T1.6
- **테스트 계획** — `scripts/test/pdf-route.ts` + Playwright (T2.6):
  - **시나리오 1 (정상)**: 로컬 dev 서버 띄우고 `fetch("http://localhost:3000/q/<seed-slug>/pdf")` → `response.headers.get("content-type") === "application/pdf"`, `response.headers.get("content-disposition")` 에 `견적서` 포함, body 크기 >50KB.
  - **시나리오 2 (실패: 잘못된 슬러그)**: `fetch("http://localhost:3000/q/invalid/pdf")` → 404.
  - **시나리오 3 (실패: Draft 견적)**: Draft 시드 → 404.
  - **시나리오 4 (엣지: 한글 파일명 인코딩)**: `Content-Disposition` 헤더 파싱해 `filename*=UTF-8''` 형식 검증, 디코딩 시 `견적서_ABC...` 일치.
  - **시나리오 5 (엣지: 응답 시간)**: 응답 시간 측정 → 콜드스타트 포함 15초 이내 (로컬), Vercel preview 10초 이내.
  - Playwright (T2.6): `browser_navigate('/q/<seed-slug>')` → `browser_click('PDF 다운로드')` → `browser_network_request()` 으로 응답 헤더 검증.
- **함정·메모**:
  - ⚠️ `params` await 필수 (Next.js 16).
  - ⚠️ Route Handler 는 `runtime = "nodejs"`, `maxDuration = 30` 명시.
  - ⚠️ `?print=1` 분기 시 인쇄 전용 CSS 누락하면 버튼이 PDF에 찍힘 — `<QuoteView>` 보강 단계가 핵심.
  - ⚠️ Vercel Function 크기 제한 (압축 50MB) — `@sparticuz/chromium` 만으로 ~50MB 근접, 다른 큰 의존성 추가 자제.

#### T2.4 — `/api/revalidate` Route Handler + Bearer 인증

- **추정**: M (0.5~1d) · **담당 영역**: data / infra · **테스트**: 단위 + 통합 (`scripts/test/revalidate.ts`) + Playwright (T2.6)
- **세부 단계**:
  1. `app/api/revalidate/route.ts` 생성. `export async function POST(req)`.
  2. 인증: `Authorization: Bearer <token>` 헤더 검증. `process.env.REVALIDATE_SECRET` 와 비교. 누락 401, 불일치 403.
  3. body: `{slug: string}` 파싱. 누락 시 400.
  4. `revalidateTag(`quote:${slug}`)` 호출 (Next.js 16 cache tag invalidation).
  5. 응답: `200 {revalidated: true, slug}`.
  6. Notion 외부 자동화(Make/Zapier) 연동 가이드를 `docs/REVALIDATE_SETUP.md` 짧게 작성 (운영자용).
- **인수 조건**:
  - 정상 토큰 + 유효 슬러그 → 200, 응답 후 해당 페이지가 다음 요청에서 fresh.
  - 토큰 누락 → 401.
  - 잘못된 토큰 → 403.
  - body 누락 → 400.
  - `revalidateTag` 가 실제로 호출됨 (Phase 2.6 Playwright 에서 캐시 동작 검증).
- **의존성**: T1.5 (cacheTag 와 일치)
- **테스트 계획** — `scripts/test/revalidate.ts`:
  - **시나리오 1 (정상)**: `fetch(POST, {headers: {Authorization: "Bearer <secret>"}, body: JSON.stringify({slug: "<seed-slug>"})})` → 200, `revalidated: true`.
  - **시나리오 2 (실패: 토큰 누락)**: header 없이 → 401.
  - **시나리오 3 (실패: 잘못된 토큰)**: `Bearer wrong` → 403.
  - **시나리오 4 (실패: body 누락)**: 빈 body → 400.
  - **시나리오 5 (엣지: 존재하지 않는 슬러그)**: 200 응답 + `revalidated: true` (revalidateTag 는 슬러그 존재 여부와 무관, 의도된 동작).
  - **시나리오 6 (통합: 캐시 무효화)** — Playwright (T2.6): Notion에서 시드 견적 `clientContact` 수정 → revalidate POST → 5초 후 `/q/<slug>` 재방문 → 변경 반영 확인.
- **함정·메모**:
  - ⚠️ `revalidateTag` 의 정확한 import 경로 확인 (Next.js 16: `next/cache` 또는 신규 위치). context7 으로 최신 API 조회.
  - ⚠️ `REVALIDATE_SECRET` 은 강한 무작위 32자 이상. `.env.example` 에 placeholder 추가.

#### T2.5 — `robots.txt` + `X-Robots-Tag` noindex 강제

- **추정**: S (<2h) · **담당 영역**: seo · **테스트**: 통합 + Playwright
- **세부 단계**:
  1. `public/robots.txt` 생성:
     ```
     User-agent: *
     Disallow: /q/
     ```
  2. `middleware.ts` 또는 페이지/라우트 response header 로 `X-Robots-Tag: noindex, nofollow, noarchive` 강제.
  3. `app/q/[slug]/page.tsx` metadata 에 `robots: {index: false, follow: false}` 추가 (이중 안전망).
- **인수 조건**:
  - `curl -I http://localhost:3000/q/<slug>` → `x-robots-tag: noindex, nofollow, noarchive` 포함.
  - `curl http://localhost:3000/robots.txt` → `Disallow: /q/` 포함.
  - HTML `<head>` 에 `<meta name="robots" content="noindex,nofollow">`.
- **의존성**: T1.5
- **테스트 계획**:
  - **시나리오 1 (정상)**: Playwright `browser_network_request('/q/<seed-slug>')` 응답 헤더에 `x-robots-tag` 검증.
  - **시나리오 2 (정상)**: `browser_navigate('/robots.txt')` 후 텍스트에 `Disallow: /q/` 포함 확인.
  - **시나리오 3 (엣지)**: `/q/<slug>/pdf` 응답에도 `x-robots-tag` 헤더가 있는지 확인 (PDF 자체가 인덱싱되면 안 됨).
- **함정·메모**:
  - Next.js 16 metadata API `robots` 옵션은 `<meta>` 만 생성. HTTP 헤더 강제는 middleware 가 가장 안정적.

#### T2.6 — Playwright MCP E2E 시나리오 + 시드 견적 2건 정비

- **추정**: L (1~2d) · **담당 영역**: qa · **테스트**: Playwright MCP (이 태스크 자체가 테스트)
- **세부 단계**:
  1. 시드 견적 2건 정비:
     - `regression-seed-active`: 정상 견적 (Status=Published, ValidUntil=2027-01-01).
     - `regression-seed-expired`: 만료 견적 (Status=Published, ValidUntil=2024-01-01).
     - 슬러그는 실제로는 nanoid(32자) 사용하되, Notion `Title` 에 `[regression-seed-*]` 접두로 운영자가 식별 가능하게.
  2. E2E 시나리오 작성·실행 (Playwright MCP):
     - **시나리오 A — 정상 열람 (데스크톱)**: `browser_resize(1280, 800)` → `browser_navigate('/q/<active-slug>')` → `browser_snapshot()` 으로 발행자·고객사·합계 확인 → `browser_console_messages()` 에 에러 없음.
     - **시나리오 B — 정상 열람 (모바일)**: `browser_resize(375, 667)` → `browser_navigate('/q/<active-slug>')` → `browser_snapshot()` 에서 항목이 카드 형태로 분해됨 확인 → 가로 스크롤 없음 (스크롤 너비 = viewport 너비).
     - **시나리오 C — 만료 배너**: `browser_navigate('/q/<expired-slug>')` → `browser_snapshot()` 에 "유효기간이 만료" 텍스트 포함.
     - **시나리오 D — 404**: `browser_navigate('/q/nonexistent-slug-x'.repeat(2))` → 404 페이지 확인.
     - **시나리오 E — Status=Draft → 404**: Draft 시드 추가(또는 active 시드를 Draft로 임시 변경) → 404.
     - **시나리오 F — noindex 헤더**: `browser_network_request('/q/<active-slug>')` → 응답 헤더 `x-robots-tag` 확인.
     - **시나리오 G — PDF 다운로드**: `browser_navigate('/q/<active-slug>')` → `browser_click('text=PDF 다운로드')` → `browser_network_request('/q/<active-slug>/pdf')` → `content-type: application/pdf`, `content-disposition` 에 `견적서` 포함.
     - **시나리오 H — 다크모드 시각 회귀**: `browser_navigate('/q/<active-slug>')` → 테마 토글 → `browser_take_screenshot({fullPage: true, filename: 'quote-dark.png'})` 베이스라인 저장.
     - **시나리오 I — revalidate 통합**: Notion 에서 `clientContact` 수정 → `fetch POST /api/revalidate` (Bearer) → 5초 후 `browser_navigate('/q/<active-slug>')` → 변경 반영 확인.
  3. 시나리오 결과를 `docs/PHASE2_E2E_REPORT.md` 에 PASS/FAIL 표로 정리.
- **인수 조건**:
  - 9개 시나리오(A~I) 모두 PASS.
  - 콘솔 에러 0건 (시나리오 A 의 `browser_console_messages`).
  - 다크모드/라이트모드 스크린샷 베이스라인 2장 저장.
- **의존성**: T1.5, T1.6, T1.7, T2.3, T2.4, T2.5
- **테스트 계획**: 이 태스크 자체가 테스트 작업. 실패 발견 시 해당 태스크로 회귀.
- **함정·메모**:
  - ⚠️ 시드 견적 입력은 운영자가 Notion UI 에서 직접 수행. 자동화 시도하지 말 것 (MVP 범위 밖).
  - ⚠️ Playwright MCP 의 `browser_navigate` 는 prod URL 또는 `npm run dev` 로컬 둘 다 가능. CI 미설정 — 수동 실행 + 결과 리포트.
  - ⚠️ 시나리오 I (revalidate 통합) 는 실제 Notion 수정이 필요 — 수정 후 원상복구 단계도 시나리오에 포함.

#### T2.7 — Vercel 배포 + 도메인 연결 + 환경변수 등록

- **추정**: M (0.5~1d) · **담당 영역**: ops · **테스트**: 수동 체크리스트
- **세부 단계**:
  1. Vercel 프로젝트 신규 생성, GitHub 리포지토리 연결.
  2. 환경변수 등록: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `REVALIDATE_SECRET`.
  3. `vercel.json` 에 `/q/[slug]/pdf` 라우트 메모리 1024MB 설정 (T2.1 참고).
  4. 커스텀 도메인 연결 (예: `quote.example.com`).
  5. preview → production 승격.
- **인수 조건**:
  - production URL 에서 시드 견적 정상 열람.
  - production 에서 PDF 다운로드 정상 (콜드스타트 포함 10초 이내).
  - revalidate webhook 이 production 환경변수로 동작.
- **의존성**: T2.3, T2.4, T2.5, T2.6
- **테스트 계획**:
  - 체크리스트:
    1. preview 배포에서 시나리오 A~I 핵심 3종(A·G·I) 재실행 → PASS.
    2. production 배포에서 동일 3종 재실행 → PASS.
    3. PDF 응답 시간 측정 (production 콜드 1회 + 핫 3회 평균).
- **함정·메모**:
  - Vercel Function 메모리 1024MB 비용 확인 (Hobby 플랜 한계). 초과 시 Pro 플랜 또는 PDF 대안(window.print) 다운그레이드 검토.

### Phase 2 완료 정의 (DoD)

- [ ] T2.1~T2.7 모든 작업 항목 인수 조건 통과.
- [ ] `npm run build` 통과.
- [ ] `npm run test:quotes`, `tsx scripts/test/pdf-route.ts`, `tsx scripts/test/revalidate.ts` 모두 통과.
- [ ] `docs/PHASE2_E2E_REPORT.md` 의 9개 시나리오 모두 PASS.
- [ ] production URL 에서 시드 견적 열람 + PDF 다운로드 + revalidate 동작.
- [ ] `robots.txt` + `X-Robots-Tag` 검증 통과.
- [ ] **정의된 테스트 시나리오가 모두 통과 (Playwright MCP 실측 + 단위·통합 스크립트 + 수동 production 체크리스트)**.

### Phase 2 리스크

- ⚠️ **R4. Vercel Function 메모리·콜드스타트** — Chromium 콜드스타트가 3초 초과 시 클라이언트 UX 손상. **완화**: T2.3 응답 시간 측정 기준 (10초) 초과 시 PDF 대안(`window.print()` + 인쇄 CSS) 다운그레이드 옵션 발동. PRD 자가검증 1번 참고.
- ⚠️ **R5. `@sparticuz/chromium` vs `puppeteer-core` 버전 호환** — 메이저 업데이트 시 launch 실패. **완화**: T2.1 에서 패키지 정확한 버전 고정 (`^` 대신 정확 버전 또는 `~`).
- ⚠️ **R6. Notion webhook 자동화 미연동** — Make/Zapier 설정은 운영자 책임. 미설정 시 자연 캐시 만료(5분)에 의존. **완화**: `docs/REVALIDATE_SETUP.md` 가이드 + cURL 예제 제공.
- ⚠️ **R7. PDF 한글 파일명 브라우저 호환성** — IE/구형 브라우저 미지원. **완화**: 타겟 사용자(모던 브라우저 가정), RFC 5987 `filename*=UTF-8''` 포맷 사용.
- ⚠️ **R8. Notion `file.url` 1시간 만료** — 견적서에 이미지 첨부 시 PDF 생성 중 만료 가능. **완화**: MVP 견적은 텍스트 위주. 이미지 첨부는 Future. `<img>` 직접 사용 금지 + `next/image` 의무화는 Phase 1 에서 enforce.

---

## Phase 3 (Future): 우선순위 매트릭스

PRD `Future work` 10항목을 임팩트(1~5) - 노력(1~5) 점수로 정렬. 점수가 높을수록 우선. 트리거 조건은 "MVP 운영 중 어떤 신호가 보이면 다음 단계로 옮길지" 기준.

| 우선순위 | 항목 | 임팩트 | 노력 | 점수 | 트리거 조건 |
|---------|------|-------|------|------|------------|
| 1 | **만료일 후 자동 차단 (410 응답)** | 5 | 1 | +4 | 클라이언트가 만료된 견적을 결재용으로 재사용한 사고 1건 이상 보고. URL 자체가 비밀 키이므로 만료 차단은 데이터 정합성 핵심 |
| 2 | **클라이언트 열람 알림 (Slack/이메일)** | 4 | 2 | +2 | 운영자가 "보냈는데 봤는지 모르겠다" 피드백 3건 이상. webhook 또는 Vercel KV + cron 으로 구현 가능 |
| 3 | **비밀번호 보호 견적 (URL + 비밀번호)** | 4 | 3 | +1 | URL 노출 사고 1건 발생 또는 운영자가 "추가 보호" 요청 |
| 4 | **운영자 로고·브랜드 컬러 커스터마이즈** | 3 | 2 | +1 | 운영자가 2명 이상(멀티 운영자 시점) 또는 브랜딩 차별화 요청 |
| 5 | **운영자 대시보드 (열람·다운로드 통계)** | 3 | 3 | 0 | 운영자가 클라이언트 행동 데이터로 후속 견적 전략을 짤 단계 |
| 6 | **견적 버전 히스토리·비교** | 3 | 3 | 0 | 단가 협상이 빈번한 클라이언트가 "이전 버전과 비교" 요청 |
| 7 | **웹 전자 서명·승인 클릭** | 4 | 5 | -1 | 사내 결재 시스템 없는 SMB 클라이언트가 다수가 될 때. 법적 효력은 별도 검토 |
| 8 | **다국어 / 다중 통화** | 3 | 4 | -1 | 해외 클라이언트 매출 비중 20% 이상 |
| 9 | **견적 항목 표를 child DB로 분리** | 2 | 4 | -2 | 항목 재사용이 빈번해 운영자가 매번 복붙에 지쳤다는 피드백 |
| 10 | **멀티 테넌트 (여러 발행자가 1개 서비스)** | 5 | 5 | 0 | 본 MVP를 SaaS화 결정. 사실상 별도 제품 |

> 📌 가정: 위 점수는 1인 운영자 시점의 추정. 실제 운영 데이터 누적 후 1회 재평가 권장 (Phase 2 launch 후 1개월).

---

## 🛣️ 크리티컬 패스 (의존성 그래프)

```
[W0 완료]
  ↓
T1.1 (Notion DB 시드)
  ↓
T1.2 (lib/quotes.ts 페치) ─┬─ T1.4 (타입, 병행)
  ↓                        │
T1.3 (항목 표 + 합계)        │
  ↓                        ↓
T1.5 (페이지 셸 + Suspense) ←┘
  ↓
T1.6 (QuoteView)
  ↓
T1.7 (만료 배너)
  ↓
[Phase 1 회귀]
  ↓
T2.1 (Chromium 설치) ─┬─ T2.2 (폰트, 병행)
  ↓                  │
T2.3 (PDF 라우트) ←──┘
T2.4 (revalidate, T2.3과 병행 가능)
T2.5 (robots, T2.3·T2.4와 병행 가능)
  ↓
T2.6 (E2E)
  ↓
T2.7 (Vercel 배포)
  ↓
[Phase 2 완료 = MVP launch]
```

**핵심 경로**: `T1.1 → T1.2 → T1.3 → T1.5 → T1.6 → T2.3 → T2.6 → T2.7`. 이 순서가 지연되면 launch 가 지연된다. T1.4/T1.7/T2.2/T2.4/T2.5 는 병행 처리해 일정 단축 가능.

---

## 🧪 테스트 전략

### 전반 원칙

- **구현 직후 즉시 테스트**: 모든 태스크는 "구현 완료" 만으로는 DoD를 만족하지 못한다. 정의된 테스트 시나리오가 통과해야 작업을 닫는다.
- **E2E·UI는 Playwright MCP 사용**: 브라우저 동작·시각 회귀·네트워크 요청 검증은 `mcp__playwright__*` 도구로 수행.
- **API·비즈니스 로직은 다층 테스트**: 단위(엣지 케이스·실패 경로) + 통합(실제 Notion 의존성 호출) 양쪽을 모두 정의. 모킹은 외부 비용·부작용이 있을 때만.
- **회귀 방지**: 버그 수정 시 해당 버그를 재현하는 테스트를 먼저 작성한 뒤 수정.
- **테스트 러너 없음 → 자기검증 스크립트 패턴**: `scripts/test/<name>.ts` + `tsx` 실행. `=== 결과 요약 ===` 출력 + `process.exitCode`. 레퍼런스: `scripts/test/notion-client.ts`. `server-only` 모듈은 직접 import 금지 → 로직 인라인 복제.

### Phase별 검증 매트릭스

| Phase | 핵심 검증 대상 | 1차 도구 | 2차 도구 |
|-------|--------------|---------|---------|
| Phase 0 (W0) | 빌드·lint·라우트 정리 | `npm run build` + `npm run lint` | 수동 |
| Phase 1 (W1) | `lib/quotes.ts` 페치 + 항목 파싱 + 합계 | `tsx scripts/test/quotes-client.ts` + `quotes-items.ts` | 수동 viewport 검수 |
| Phase 1 (W1) | `/q/[slug]` 렌더 + 모바일 | 수동 dev server | Playwright (T2.6 통합) |
| Phase 2 (W2) | PDF 라우트 | `tsx scripts/test/pdf-route.ts` + Playwright `browser_network_request` | 수동 production 검수 |
| Phase 2 (W2) | revalidate webhook | `tsx scripts/test/revalidate.ts` | Playwright 통합 (T2.6 시나리오 I) |
| Phase 2 (W2) | robots/noindex | Playwright `browser_network_request` + curl | metadata 검증 |
| Phase 2 (W2) | E2E 회귀 | **Playwright MCP** (시나리오 A~I) | 베이스라인 스크린샷 |

### Playwright MCP 함수 베이스라인

이 프로젝트의 모든 UI E2E 는 다음 함수로 작성한다:

- `mcp__playwright__browser_navigate(url)` — 페이지 이동
- `mcp__playwright__browser_snapshot()` — ARIA 트리 기반 상태 확인 (셀렉터보다 우선)
- `mcp__playwright__browser_click({element, ref})` / `browser_fill_form` / `browser_type` — 인터랙션
- `mcp__playwright__browser_network_request(url)` / `browser_network_requests()` — Route Handler·API 응답 헤더 검증
- `mcp__playwright__browser_take_screenshot({fullPage, filename})` — 다크모드·시각 회귀
- `mcp__playwright__browser_console_messages()` — 클라이언트 에러 감지
- `mcp__playwright__browser_resize(width, height)` — 모바일/데스크톱 viewport 전환
- `mcp__playwright__browser_evaluate({function})` — 커스텀 어서션 (예: `getComputedStyle` 폰트 확인)

### 시드 견적 정책

- 최소 2건 유지: `regression-seed-active` (정상, ValidUntil 미래), `regression-seed-expired` (만료, ValidUntil 과거).
- 슬러그는 실제 nanoid(32자) 사용. 식별은 Notion `Title` 의 `[regression-seed-*]` 접두로.
- 시드 수정은 운영자가 Notion UI 에서 수행. 자동화 금지.
- Playwright 시나리오는 항상 시드 우선 사용 (임시 견적은 불안정).

---

## 📊 마일스톤 & 지표

| 마일스톤 | 시점 | 측정 지표 | 목표 |
|---------|------|----------|------|
| Phase 1 완료 | W1 종료 | `npm run build` 통과, `npm run test:quotes` 통과, 시드 견적 데스크톱·모바일 렌더 PASS | 100% |
| Phase 2 PDF | T2.3 완료 | PDF 응답 시간(로컬) | 콜드 15s, 핫 5s 이내 |
| Phase 2 E2E | T2.6 완료 | Playwright 시나리오 A~I PASS율 | 9/9 (100%) |
| Phase 2 production | T2.7 완료 | production PDF 응답 시간 | 콜드 10s, 핫 3s 이내 |
| MVP launch | W2 종료 | 운영자가 견적 1건 5분 안에 발행 → 클라이언트가 PDF 다운로드 성공 | 1회 시연 성공 |

---

## 🔗 의존성 맵

### 외부 의존성

- **Notion API** (`@notionhq/client` v5) — `databases.retrieve` → `dataSources.query` 2단계. T1.2/T1.3/T2.4 에 의존.
- **Vercel** — Function 메모리 1024MB, `nodejs` runtime. T2.3/T2.7 에 의존.
- **`@sparticuz/chromium` + `puppeteer-core`** — PDF 생성. T2.3 에 의존. ⚠️ 패키지 버전 매트릭스 확인 필수.
- **Pretendard (또는 Noto Sans KR)** — 한글 폰트. T2.2 에 의존.
- **Make/Zapier (선택)** — Notion 변경 webhook 트리거. T2.4 운영자 측 설정.

### 신규 npm 의존성 (설치 시점)

| 패키지 | 버전 정책 | 설치 시점 | 용도 |
|--------|---------|----------|------|
| `nanoid` (선택) | latest | T1.1 직전 (운영자가 Notion Formula 대신 nanoid 선택 시) | slug 생성 |
| `puppeteer-core` | 정확 버전 고정 | T2.1 시작 시 | PDF 헤드리스 |
| `@sparticuz/chromium` | 정확 버전 고정 (`puppeteer-core` 호환 확인) | T2.1 시작 시 | Vercel Function용 Chromium |

> 📌 가정: 위 외 모든 의존성은 W0 초기화 시점에 이미 설치됨. 추가 라이브러리(예: `fuse.js`, `algoliasearch`)는 MVP 범위 밖.

---

## ⚠️ 리스크 레지스터

| ID | 리스크 | 영향 | 발생 가능성 | 완화 전략 | 책임 Phase |
|----|-------|------|----------|---------|----------|
| R1 | Notion 표 row 100개 초과 | 항목 일부 누락 | 낮음 | T1.3 에서 `has_more` 체크 + warning | Phase 1 |
| R2 | Next.js 16 `cacheTag` API 시그니처 변경 | 캐시 무효화 실패 | 중간 | T1.5 작업 직전 context7 + `node_modules/next/dist/docs/` 확인 | Phase 1 |
| R3 | Notion v5 SDK 타입 변경 | 빌드/런타임 실패 | 중간 | `isFullPage` 가드, `scripts/test/notion-client.ts` 패턴 준수 | Phase 1 |
| R4 | Vercel Function 콜드스타트 >10s | PDF UX 손상 | 중간 | T2.3 측정 후 한계 초과 시 `window.print()` 다운그레이드 | Phase 2 |
| R5 | `chromium`/`puppeteer-core` 버전 호환 불일치 | PDF launch 실패 | 중간 | T2.1 정확 버전 고정 + CHANGELOG 확인 | Phase 2 |
| R6 | Notion webhook 자동화 미연동 | 즉시 갱신 안 됨 | 높음 | `docs/REVALIDATE_SETUP.md` 가이드, 자연 캐시(5분) fallback | Phase 2 |
| R7 | PDF 한글 파일명 브라우저 호환성 | 다운로드 파일명 깨짐 | 낮음 | RFC 5987 `filename*=UTF-8''` 사용, 타겟 = 모던 브라우저 가정 | Phase 2 |
| R8 | Notion `file.url` 1시간 만료 | 이미지 깨짐 | 낮음 (MVP는 텍스트 위주) | `<img>` 금지 + `next/image` 의무화. 이미지는 Future | Phase 1 |
| R9 | 운영자가 슬러그를 32자 미만으로 입력 | URL 보안 약화 | 중간 | T1.2 페치 단계에서 형식 검증 → 404 (PRD 정합성 규칙 3) | Phase 1 |
| R10 | 중복 slug 시 빌드 실패가 너무 강함 | 잘못된 견적 1건 때문에 전체 차단 | 낮음 | PRD 정합성 규칙 1 의도된 동작 — 데이터 손상 신호로 즉시 운영자에게 알림 | Phase 1 |

---

## 🤔 결정 필요 항목 (PRD 자가검증 5종 — 사용자 확정 대기)

본 로드맵은 PRD 의 "기본안" 을 채택했지만, 운영자가 다음 5종 결정을 확정해야 일부 태스크가 최종 형태를 갖는다. ⚠️ 표시.

1. ⚠️ **PDF 생성 방식**: 기본안 = `@sparticuz/chromium` + `puppeteer-core`. 대안 = `window.print()` + 인쇄 전용 CSS.
   - **영향 태스크**: T2.1, T2.3.
   - **결정 기준**: Vercel Function 비용·콜드스타트 부담 vs 결과 일관성.
2. ⚠️ **slug 생성 주체**: 기본안 = 운영자가 Notion 에 수동 nanoid(32자) 붙여넣기. 대안 = Notion `Formula` 자동 생성, 또는 Make/Zapier 보조.
   - **영향 태스크**: T1.1, T1.2.
   - **결정 기준**: 운영자 워크플로 단순성 vs Notion Formula 학습 부담.
3. ⚠️ **항목 표 위치**: 기본안 = Notion page body 첫 `table` 블록. 대안 = child DB 분리.
   - **영향 태스크**: T1.3.
   - **결정 기준**: MVP 단순성 vs 항목 재사용성.
4. ⚠️ **부가세 기본값**: 기본안 = 10%. 대안 = 0%(면세사업자) 또는 운영자별 디폴트.
   - **영향 태스크**: T1.3.
   - **결정 기준**: 운영자 사업 형태.
5. ⚠️ **만료 견적 정책**: 기본안 = 열람 허용 + 배너 표시. 대안 = 410 차단을 P0 로 승격.
   - **영향 태스크**: T1.7. Phase 3 의 1순위(자동 차단)를 MVP로 끌어올리는 결정.
   - **결정 기준**: 결재용 정합성 사고 위험도.

---

## 📝 변경 이력

| 일자 | 변경 | 작성자 |
|------|------|-------|
| 2026-05-17 | 견적서 도메인 기준 신규 작성 (블로그 로드맵은 `docs/archive/ROADMAP.md` 로 이동) | prd-roadmap-architect |
| 2026-05-21 | T1.1~T1.6 완료 검증·체크 (산출물 8종 존재·`test:quotes` 7/7·build `/q/[slug]` Partial Prerender). T1.7(`isQuoteExpired`)·코드리뷰 잔여 | /git:docs:update-roadmap |
| 2026-05-21 | T1.7 완료 (`isQuoteExpired` 헬퍼 + `quote-data.tsx` 배선 + 만료 단위 3종). `test:quotes` 10/10·build 통과. Phase 1 잔여=code-reviewer-kr 리뷰 | quote-viewer-builder |
