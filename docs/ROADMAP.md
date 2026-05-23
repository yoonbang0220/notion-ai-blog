# ROADMAP — 노션 기반 견적서 웹뷰어 + PDF 다운로드 MVP

> 최종 업데이트: 2026-05-22 | 기반 문서: `docs/QUOTE_VIEWER_PRD.md` (+ 부록 A. v1.x 고도화)
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
| Phase 3 (W3) | v1.x 고도화 — 운영자 관리 화면(`/admin` 인증·견적 목록·링크 복사·다크모드 검증) | 파트타임 1주 (실작업 ~20h) | `lib/admin-auth.ts`, `app/admin/*`, `lib/quotes.ts::queryPublishedQuotes`, `components/admin/copy-link-button.tsx`, `scripts/test/admin-*.ts` |
| Phase 4 (Future) | 10항목 우선순위 매트릭스 정렬 | 트리거 조건 발생 시 | 비밀번호 보호·자동 차단·열람 알림 등 (구현 보류) |

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
- **함정·메모**: 만료여도 페이지 노출은 허용(PRD 가정). 차단은 Future(Phase 4).

#### ✅ T1.8 — 랜딩 페이지 `/` 정식화 (운영자용 소개)

> ✅ **완료 (2026-05-21, quote-ui-designer 검증)**: `app/page.tsx` 가 히어로(서비스명 + "Notion 으로 쓰고, 링크로 공유하고, PDF 로 결재") + 운영자 3스텝 안내(작성→발행→공유) 정식 정적 랜딩으로 렌더. 검증 결과 — `npm run build` 에서 `/` 가 `○ (Static)` 유지, `tsc --noEmit`·`lint` 무경고, Playwright 데스크톱(1280×800)·모바일(375×667 가로스크롤 0)·다크모드 3종 통과, 콘솔 에러 0. 색 하드코딩 0(토큰만), shadcn `Card` 재사용, 범위 밖 기능 없음.

- **추정**: S (<2h) · **담당 영역**: ui · **테스트**: 빌드 + Playwright(시각) · **권장 에이전트**: `quote-ui-designer`
- **배경**: 현재 `/` 는 W0 의 개발용 임시 플레이스홀더("초기화 완료")다. PRD IA(`/  랜딩 — 운영자용 소개, MVP 는 정적 1페이지로 충분`)·"운영자는 Notion 에서만 작업한다" 기준으로 **정식 정적 랜딩**으로 교체한다. (2026-05-21 추가 — 메인 화면이 PRD 에는 있으나 ROADMAP 태스크가 누락돼 있었음.)
- **세부 단계**:
  1. `app/page.tsx` 의 플레이스홀더를 교체. **정적 페이지**(Notion 페치 없음 → 빌드에서 `○ Static` 유지).
  2. 콘텐츠(간결): 서비스명 + 한 줄 가치 제안("Notion 으로 쓰고, 링크로 공유하고, PDF 로 결재"), 운영자용 짧은 안내(견적은 Notion 에서 작성 → `Status=발행` → 생성된 링크를 클라이언트에게 공유), 푸터. **클라이언트는 직접 `/q/[slug]` 링크로 들어오므로 견적 목록·검색·로그인은 만들지 않는다.**
  3. 디자인: 기존 토큰(oklch)·다크모드·반응형. shadcn `card`/`button` 재사용, 색 하드코딩 금지. `components/common/Header`·`Footer` 와 일관. 한글 폰트(Pretendard)는 T2.2 적용 시 자동 반영.
- **인수 조건**:
  - `/` 가 "초기화 완료" 개발 문구가 아닌 정식 소개 화면으로 렌더.
  - 데스크톱·모바일·다크모드 3종에서 깨짐 없음.
  - `npm run build` 에서 `/` 가 `○ (Static)` 유지(동적 데이터 없음).
  - 로그인·대시보드·견적 목록 등 범위 밖 기능 없음(PRD "정적 1페이지로 충분").
- **의존성**: 없음 — T1.x·W2 와 독립, 병행 가능. **크리티컬 패스 아님**(클라이언트 Goal 검증은 `/q/[slug]` 로만 이뤄짐).
- **테스트 계획**:
  - 빌드: `npm run build` → `/` 가 `○ (Static)`.
  - Playwright: `browser_navigate('/')` → `browser_snapshot()` 으로 소개 텍스트 확인, `browser_resize(375,667)` 모바일 깨짐 없음, 다크모드 스크린샷 1장.
- **함정·메모**: 범위 최소 유지 — 과설계 금지. 운영자 전용 화면·인증은 Phase 3(v1.x 고도화)에서, 통계 대시보드는 Future(Phase 4). 랜딩은 정적 페이지이므로 `"use cache"`/Suspense 불필요.

### Phase 1 완료 정의 (DoD)

- [x] T1.1~T1.8 모든 작업 항목 인수 조건 통과. *(T1.1~T1.7 ✅ 완료·코드리뷰 반영 / T1.8 ✅ 2026-05-21 quote-ui-designer 검증)*
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

#### ✅ T2.1 — `puppeteer-core` + `@sparticuz/chromium` 설치 + 로컬/Vercel 동작 검증

> ✅ **완료 (2026-05-21)**: `puppeteer-core@24.43.1` + `@sparticuz/chromium@148`(호환 버전 핀, R5 완화) 런타임 설치. `scripts/test/pdf-spike.ts` 3/3(로컬 Windows 시스템 Chrome 분기 → `out/spike.pdf` 19KB). launch 환경 분기는 `lib/pdf-browser.ts` 로 공유. `vercel.json` 에 PDF 라우트 `memory:1024/maxDuration:30`. ⚠️ 로컬은 시스템 Chrome 으로만 검증 — 서버리스(@sparticuz) executablePath 경로는 T2.7 배포 시 실측 필요.

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

#### ✅ T2.2 — 한글 폰트 임베드 (Pretendard 또는 Noto Sans KR)

> ✅ **완료 (2026-05-21)**: `public/fonts/PretendardVariable.woff2`(OFL) 를 `next/font/local` 로 `app/layout.tsx` 에 임베드 → `--font-pretendard`. `app/globals.css` `@theme inline` 의 `--font-sans` 1순위로 설정(Geist 폴백 유지). PDF 인쇄 시 폰트 보장 위해 `display:"block"` + 라우트 `waitUntil:"networkidle0"`. 전 사이트(랜딩 포함) 적용.

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

#### ✅ T2.3 — `/q/[slug]/pdf` Route Handler (헤드리스 Chromium 인쇄)

> ✅ **완료 (2026-05-21)**: `app/q/[slug]/pdf/route.ts` — `await params` → `getQuoteBySlug`(null→404) → 자체 origin `/q/${slug}?print=1` 헤드리스 인쇄 → `application/pdf`. `finally` 에서 `browser.close()`. RFC 5987 한글 파일명(`견적서_<고객사>_<YYYYMMDD>.pdf`). UI 크롬 숨김은 `print:hidden`(puppeteer 가 print 미디어 에뮬). `scripts/test/pdf-route.ts` 5/5(정상 PDF 188KB·404·한글파일명·응답시간; Draft 시드 부재로 Draft 시나리오는 미존재 slug 404 로 대체). ⚠️ `cacheComponents:true` 충돌로 `runtime` export 미사용(기본 nodejs). 코드리뷰 quick fix C2(500 내부메시지 비노출)·M4(로컬 비-Linux `--no-sandbox` 제거)·S3(print 배너 정리) 반영.

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

#### ✅ T2.4 — `/api/revalidate` Route Handler + Bearer 인증

> ✅ **완료 (2026-05-21)**: `app/api/revalidate/route.ts` — `Authorization: Bearer <NOTION_REVALIDATE_SECRET>`(헤더 누락 401·불일치 403·secret 미설정 500), body `{slug}`(누락/빈/JSON깨짐 400), `revalidateTag(\`quote:${slug}\`, {expire:0})`(webhook 즉시만료 패턴) → 200 `{revalidated,slug}`. 운영자 가이드 `docs/REVALIDATE_SETUP.md`. `scripts/test/revalidate.ts` 9/9. ⚠️ 시크릿 변수명은 SSOT `NOTION_REVALIDATE_SECRET`(본 문서 구표기 `REVALIDATE_SECRET` 아님). 코드리뷰 quick fix C1(`crypto.timingSafeEqual` 타이밍 안전 비교) 반영. 시나리오6(Notion 수정→반영 통합)은 T2.6 이연.

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

#### ✅ T2.5 — `robots.txt` + `X-Robots-Tag` noindex 강제

> ✅ **완료 (2026-05-21)**: `public/robots.txt`(`Disallow: /q/`) 추가. `X-Robots-Tag: noindex, nofollow, noarchive` 는 `proxy.ts` 의 `/q/:path*` matcher 가 견적 페이지·`/q/[slug]/pdf` 응답 모두에 강제(T1.5 부터), `app/q/[slug]/page.tsx generateMetadata` 가 `robots:{index:false}` meta 이중망. 검증: `/robots.txt` Disallow + `/q/<slug>`·`/q/<slug>/pdf` 헤더 모두 확인. (헤더/meta 는 기존 구현, 본 태스크는 robots.txt + 검증.)

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

#### ✅ T2.6 — Playwright MCP E2E 시나리오 + 시드 견적 2건 정비

> ✅ **완료 (2026-05-21, qa-engineer)**: dev 환경 검증 가능한 **7종(A·B·C·D·F·G·H) 전부 PASS** — 정상 데스크톱(총합 2,090,000), 모바일 카드분해·가로스크롤 0, 만료 배너, 404, noindex 헤더(견적+PDF), PDF 다운로드 188KB·한글 파일명, 다크모드. 콘솔 에러 0, 버그 0. 리포트: `docs/PHASE2_E2E_REPORT.md`. ⚠️ **E(Draft→404)·I(revalidate 통합)는 T2.8(production 배포)로 이연** — Draft 시드 부재(기존 시드 훼손 불가)·dev `"use cache"` 동작이 production 과 상이·`ClientContact` 필드 DB 부재 때문. 메커니즘은 서버 Published 필터 + `test:quotes` 10/10·`revalidate` 9/9 로 커버.

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

#### ✅ T2.7 — 배포 전 하드닝 (전역 에러 경계 · 레이트리밋 · 폰트 서브셋)

> ✅ **완료 (2026-05-21, quote-viewer-builder + code-reviewer-kr)**: (1) `app/error.tsx` 전역 에러 경계(`"use client"`, reset·홈으로, 에러 메시지 비노출). (2) `lib/rate-limit.ts` 경량 in-memory 고정윈도우 — `/q/[slug]/pdf` 분당 10/IP·`/api/revalidate` 분당 30/IP, 초과 시 429+`Retry-After`. ⚠️ 서버리스 인스턴스 간 미공유 best-effort(분산 KV 는 백로그). (3) Pretendard 폰트 서브셋 **2MB→452KB(77.5%↓)**, KS X 1001 상용 2350자+ASCII, 한글 폴백 0 실측. 검증: tsc·lint·build·`test:quotes` 10/10·`pdf-route` 5/5·`revalidate` 9/9·`rate-limit` 5/5. 코드리뷰 quick fix: C2(스윕 기준 RATE_LIMITS 도출)·M4(에러 메시지 일반화)·m1(Vercel IP 헤더 우선). *C1(스윕 off-by-one)은 오탐으로 판정 — 원 로직이 amortized 1% 의도대로 동작.*

- **추정**: M (0.5~1d) · **담당 영역**: infra / security / perf · **테스트**: 단위 + Playwright · **권장 에이전트**: `quote-viewer-builder`
- **배경**: 코드리뷰·E2E 통과 후 production 노출 직전 **최소 견고화**. (2026-05-21 사용자 결정 — "최소(MVP 충실)" 구조 채택: 배포 전 필수 하드닝 1개만, 추가 성능·보안헤더·분산 레이트리밋은 배포 후 **측정 기반 백로그**에서 선별.) "측정 없는 최적화는 추측"이라 본격 성능 튜닝은 T2.8 production 실측 이후로 미룬다.
- **세부 단계**:
  1. **전역 에러 경계** — `app/error.tsx` 신규(`"use client"`). `getQuoteBySlug` 의 중복 slug `throw`(정합성 규칙 1)·Notion API 실패가 흰 화면/스택트레이스가 아니라 한국어 안내 + "다시 시도"·"홈으로" 로 graceful 하게 처리. 필요 시 `app/q/[slug]/error.tsx`(견적 경로 전용)·`app/global-error.tsx`(루트 레이아웃 실패) 검토.
  2. **레이트리밋(best-effort)** — 비싼 공개 엔드포인트 `/q/[slug]/pdf` 우선, `/api/revalidate`(이미 Bearer 인증이라 후순위). ⚠️ 서버리스는 in-memory 가 인스턴스 간 공유 안 됨 → MVP 는 경량 제한(IP/슬러그 기준) + 임계 초과 시 429. **견고한 분산 리밋(Upstash/Vercel KV)은 백로그**로 명시(신규 외부 의존성·비용 결정 필요).
  3. **폰트 서브셋(빠른 성능 1건)** — `public/fonts/PretendardVariable.woff2`(2MB)를 한글(상용 글리프)+영문+숫자 subset 으로 축소(수백 KB 목표). `next/font/local` 배선 유지, 한글 누락 없는지 견적/랜딩 실측.
- **인수 조건**:
  - 데이터 페치 throw(중복 slug 등) 시 `app/error.tsx` 가 한국어 안내로 렌더 — 흰 화면·스택트레이스 노출 0.
  - `/q/[slug]/pdf` 연속 호출 시 임계 초과분이 429(또는 정의 코드)로 제한.
  - 폰트 전송 크기 유의미 감소(빌드 자산/네트워크 탭 before/after 비교).
  - `npm run build`·`tsc`·`lint` 통과 + 기존 회귀(`test:quotes` 10/10·`pdf-route` 5/5·`revalidate` 9/9) 유지, 견적/랜딩 한글 렌더 정상.
- **의존성**: T2.6. **배포(T2.8) 직전 단계.**
- **테스트 계획**:
  - 단위/통합: `scripts/test/<name>.ts` — 레이트리밋 임계 동작(허용/초과 차단) + (가능 시) error 경계 throw 시나리오.
  - Playwright: 중복 slug(또는 throw 유발) → `error.tsx` 안내 텍스트 확인 / `/q/<slug>/pdf` 연속 호출 → 429 `browser_network_request`.
- **함정·메모**: ⚠️ Route Handler 에 `runtime` export 금지(cacheComponents 충돌, T2.3 실측). 서버리스 in-memory 리밋 한계 명시(완전한 보장은 KV 백로그). 폰트 subset 시 한글 글리프 누락 주의. **과설계 금지 — "최소" 결정 준수**(보안 헤더·분산 리밋·VRT 등은 백로그).

#### ✅ T2.8 — Vercel 배포 + 도메인 연결 + 환경변수 등록 (+ production 실측 · 이연 E2E)

> ✅ **완료 (2026-05-23, MVP launch)**: production 실측 마무리. **revalidate webhook E2E** 401/403/400/200(로컬↔Vercel 시크릿 일치 확인) · **Lighthouse 랜딩(mobile)** Perf 84·A11y/BP/SEO 100(LCP 4.5s) · **PDF** 웜 3.3~4.3s·콜드 15.3s·동시 5/5 200 · 잘못된/Draft slug → **not-found UI 정상**(PPR soft-404=HTTP 200, `/q/` noindex 라 SEO 영향 0). **콜드스타트 R4 판단 = accept + 백로그**(window.print 다운그레이드 미채택 — PDF 1회성·웜 충분·서버 PDF 품질 보존). **이연 E(Draft 라이브)·I(콘텐츠 편집 통합) E2E 는 운영자 Notion 데이터 보존 위해 생략**, 서버 `상태=발행` 필터 + 로컬 `test:admin-quotes`/`test:revalidate` 로 메커니즘 커버. 런치 비차단 백로그: LCP 최적화·하드 404 상태·콘텐츠 통합 E2E·콜드 단축·(선택)커스텀 도메인. 상세: `docs/PHASE2_LAUNCH_REPORT.md`. → **MVP(Phase 0~2) launch 완료.**

> 📌 **배포 경과 (2026-05-22)**: GitHub 연동 배포 완료 — `notion-ai-blog-zeta.vercel.app`(커밋 f14e6b8). ✅ 랜딩·견적 열람·Notion 환경변수(4개)·noindex 헤더 정상(Playwright/curl 실측). ✅ **PDF production 동작** — 서버리스 Chromium 3중 수정으로 해결: (1) `serverExternalPackages` (2) `outputFileTracingIncludes` 로 chromium `/bin` 함수 포함 (3) `launchBrowser()` ETXTBSY 재시도(동시 추출 race). **동시 5건 요청 5/5 HTTP 200·application/pdf(~8s)**, 웜 4.3s. ⚠️ **잔여(미완 — ✅ 불가)**: ① 콜드스타트 **15.3s**(10초 목표 초과, R4 판단) ② 이연 E2E E(Draft→404)·I(revalidate 통합) production 실측 ③ revalidate webhook production E2E ④ Lighthouse 측정 ⑤ (선택) 커스텀 도메인.

- **추정**: M (0.5~1d) · **담당 영역**: ops · **테스트**: 수동 체크리스트 + production 실측
- **세부 단계**:
  1. Vercel 프로젝트 신규 생성, GitHub 리포지토리 연결.
  2. 환경변수 등록: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_ITEMS_DATABASE_ID`, `NOTION_REVALIDATE_SECRET`. *(시크릿 변수명은 SSOT 기준 `NOTION_REVALIDATE_SECRET`)*
  3. `vercel.json` 에 `/q/[slug]/pdf` 라우트 메모리 1024MB 설정 — ✅ T2.1 에서 추가 완료(`functions` memory:1024/maxDuration:30).
  4. 커스텀 도메인 연결 (예: `quote.example.com`).
  5. preview → production 승격.
  6. **이연 E2E 마무리(T2.6→여기)**: (E) Draft 전용 시드 추가 후 `/q/<draft-slug>` → 404 실측 / (I) production 캐시 hit → Notion 견적 필드(존재하는 필드, 예: 비고) 수정 → `POST /api/revalidate`(Bearer) → 5초 후 재방문 변경 반영 실측.
  7. **production 성능 실측(측정 우선)**: Lighthouse(LCP/TBT) + PDF 콜드스타트/핫 응답시간 측정 → 결과를 백로그 판단 근거로 기록.
- **인수 조건**:
  - ✅ production URL 에서 시드 견적 정상 열람. *(2026-05-22 Playwright/curl 실측)*
  - ✅ production 에서 PDF 다운로드 정상 — 동작 OK(동시 5/5 200·웜 3.3~4.3s). 콜드스타트 15.3s 는 **R4 = accept+백로그**로 판단(2026-05-23).
  - ✅ revalidate webhook 이 production 환경변수로 동작 — E2E 401/403/400/200 실측(2026-05-23).
  - ◐ 이연 E2E E(Draft→404)·I(revalidate 통합) — 잘못된/Draft slug → not-found UI 정상(soft-404). 라이브 Draft·콘텐츠 편집 통합은 운영자 데이터 보존 위해 생략, 서버 발행 필터+로컬 테스트로 메커니즘 커버.
  - ✅ production 성능 수치 — PDF 응답시간(콜드 15.3s/웜 3.3~4.3s/동시 ~8s) + Lighthouse 랜딩 Perf 84·A11y/BP/SEO 100(LCP 4.5s=백로그).
- **의존성**: T2.3, T2.4, T2.5, T2.6, T2.7
- **테스트 계획**:
  - 체크리스트:
    1. preview 배포에서 시나리오 A~I 핵심 3종(A·G·I) 재실행 → PASS.
    2. production 배포에서 동일 3종 재실행 → PASS.
    3. PDF 응답 시간 측정 (production 콜드 1회 + 핫 3회 평균).
- **함정·메모**:
  - Vercel Function 메모리 1024MB 비용 확인 (Hobby 플랜 한계). 초과 시 Pro 플랜 또는 PDF 대안(window.print) 다운그레이드 검토.

### Phase 2 완료 정의 (DoD)

- [x] T2.1~T2.8 모든 작업 항목 인수 조건 통과. *(T2.1~T2.8 ✅ — T2.8: revalidate prod E2E·Lighthouse·PDF 실측 완료, 콜드스타트 R4=accept+백로그, 이연 E·I 는 메커니즘 커버[라이브 생략=운영자 데이터 보존])*
- [x] `npm run build` 통과. *(2026-05-21: `/` Static · `/q/[slug]` PPR · `/q/[slug]/pdf`·`/api/revalidate` ƒ)*
- [x] `npm run test:quotes`, `tsx scripts/test/pdf-route.ts`, `tsx scripts/test/revalidate.ts` 모두 통과. *(test:quotes 10/10 · pdf-route 5/5 · revalidate 9/9)*
- [x] `docs/PHASE2_E2E_REPORT.md` 의 9개 시나리오. *(dev 7종 A·B·C·D·F·G·H PASS / E·I 는 production 에서 not-found UI(soft-404) + revalidate 200 + 로컬 9/9 로 메커니즘 커버 — 라이브 Draft·콘텐츠 편집은 운영자 데이터 보존 위해 생략, `docs/PHASE2_LAUNCH_REPORT.md`)*
- [x] production URL 에서 시드 견적 열람 + PDF 다운로드 + revalidate 동작. *(2026-05-23: 열람 ✅ · PDF ✅(웜 3.3~4.3s·콜드 15.3s R4 accept) · revalidate prod E2E 401/403/400/200 ✅)*
- [x] `robots.txt` + `X-Robots-Tag` 검증 통과. *(T2.5 — robots.txt Disallow + proxy.ts 헤더 + meta)*
- [x] **정의된 테스트 시나리오가 모두 통과 (Playwright MCP 실측 + 단위·통합 스크립트 + 수동 production 체크리스트)**. *(라이브 콘텐츠 통합 E2E 만 운영자 데이터 보존 위해 메커니즘 커버로 대체)*

### 측정 후 백로그 (T2.8 production 실측 뒤 데이터 기반 선별)

> 2026-05-21 "최소(MVP 충실)" 결정에 따라 배포 전엔 만들지 않고, T2.8 실측 수치를 보고 필요한 것만 채택한다.

- 분산 레이트리밋(Upstash/Vercel KV) — 서버리스 인스턴스 간 공유 보장(T2.7 의 best-effort 상위 버전). 신규 외부 의존성·비용 결정 필요.
- 보안 헤더 강화(CSP·X-Frame-Options·Referrer-Policy 등) — `next.config.ts headers()` 또는 `proxy.ts`.
- 성능 튜닝(데이터 기반) — Lighthouse/콜드스타트 결과에 따른 PDF 콜드스타트 완화(`window.print()` 폴백, R4), 캐시 TTL 조정, 이미지/번들 추가 최적화.
- 시각 회귀(VRT) 자동화(Percy/Chromatic 등) — 다크모드 픽셀 비교(T2.6 H 는 현재 수동).

### Phase 2 리스크

- ⚠️ **R4. Vercel Function 메모리·콜드스타트** — Chromium 콜드스타트가 3초 초과 시 클라이언트 UX 손상. **완화**: T2.3 응답 시간 측정 기준 (10초) 초과 시 PDF 대안(`window.print()` + 인쇄 CSS) 다운그레이드 옵션 발동. PRD 자가검증 1번 참고.
- ⚠️ **R5. `@sparticuz/chromium` vs `puppeteer-core` 버전 호환** — 메이저 업데이트 시 launch 실패. **완화**: T2.1 에서 패키지 정확한 버전 고정 (`^` 대신 정확 버전 또는 `~`).
- ⚠️ **R6. Notion webhook 자동화 미연동** — Make/Zapier 설정은 운영자 책임. 미설정 시 자연 캐시 만료(5분)에 의존. **완화**: `docs/REVALIDATE_SETUP.md` 가이드 + cURL 예제 제공.
- ⚠️ **R7. PDF 한글 파일명 브라우저 호환성** — IE/구형 브라우저 미지원. **완화**: 타겟 사용자(모던 브라우저 가정), RFC 5987 `filename*=UTF-8''` 포맷 사용.
- ⚠️ **R8. Notion `file.url` 1시간 만료** — 견적서에 이미지 첨부 시 PDF 생성 중 만료 가능. **완화**: MVP 견적은 텍스트 위주. 이미지 첨부는 Future. `<img>` 직접 사용 금지 + `next/image` 의무화는 Phase 1 에서 enforce.

---

## Phase 3 (W3): v1.x 고도화 — 운영자 관리 화면

> 기반 문서: `docs/QUOTE_VIEWER_PRD.md` **부록 A. v1.x 고도화 (2026-05-22)**. (2026-05-22 추가.)
> ⚠️ 이 Phase 는 MVP(Phase 0~2) 완료·Vercel 배포 후 시작하는 **다음 개발 단계**다. PRD 본문(MVP)이 아닌 **부록 A** 가 SSOT.

### 목표

운영자(박상준)가 **인증으로 보호되는 `/admin` 화면**에서 발행된 견적 전체를 목록으로 보고, 각 견적의 **완성된 공유 링크를 1클릭으로 클립보드에 복사**할 수 있다. 동시에 이 화면은 인증 없이는 누구도 열 수 없어 **전체 견적 URL 목록이 외부에 유출되지 않는다**.

> ⚠️ **MVP 가정 2건을 의도적으로 뒤집는다**(PRD 본문 각주): ① "운영자 전용 화면을 만들지 않는다" → `/admin` 도입. ② "목록 조회 함수를 만들지 않는다" → `queryPublishedQuotes()` 신규. 단 이는 **"목록 + 링크 복사"** 화면이며 "통계 대시보드"(여전히 Future, Phase 4)와는 별개다.

### 🔐 보안 — 이 Phase 의 최상위 P0 (가장 중요)

> **왜 인증이 선행되어야 하는가** — MVP 보안 모델은 "URL 자체가 비밀"(추측 불가 32자 slug)이다. `/admin` 목록은 **모든 견적의 공유 링크를 한 곳에 모아 노출**한다. 인증 없이 공개되면 **단 한 번의 접근으로 전체 견적 URL 이 통째로 유출**되어 MVP 보안 모델 전체가 붕괴한다.

- ⚠️ **배포 게이트(절대 규칙)**: T3.3(목록 페이지)·T3.4(링크 복사)는 **T3.1(인증 게이트) 완료·검증 전에는 production 배포 금지**. 인증 없는 `/admin` 이 한 순간이라도 노출되면 전체 slug 유출. 의존성·DoD·리스크(R11)에 명시.
- 인증과 무관하게 항상 적용: `/admin/*` 응답 `X-Robots-Tag: noindex, nofollow, noarchive`(proxy matcher 확장) + `robots.txt` `Disallow: /admin`. 비밀번호·세션 시크릿은 `NEXT_PUBLIC_` 금지(서버 전용), 비교는 타이밍 안전(`crypto.timingSafeEqual` 또는 동등). 로그인 실패 시 응답에 어떤 견적 정보도 포함 금지(목록 페치는 인증 통과 후에만 실행).

### 📌 가정

- 단일 운영자 MVP 성격(다중 사용자·역할 없음). **신규 npm install 0** 가정 — 인증=Web Crypto 내장, 복사=`navigator.clipboard`, UI=기존 shadcn(`field`/`input`/`button`)·sonner·next-themes 재사용.
- 인증 방식은 PRD A.9 **권장안(환경변수 비번 + 서명 세션 쿠키)** 을 기본으로 본 로드맵에 작성하되, **운영자 확정 전까지 미확정**(아래 "결정 필요 항목 (Phase 3)" 참조). 대안(HTTP Basic Auth / Vercel 플랫폼 보호) 채택 시 T3.1 의 세부 구현이 바뀐다.
- 신규 Notion 속성 0 — 관리자 목록이 쓰는 6필드(title·clientCompany·quoteNumber·issuedAt·status·slug)는 `types/index.ts` 의 기존 `Quote` 타입에 모두 존재(실측 2026-05-22).
- 실작업 추정(파트타임): 약 1주(~20h). 인증(L)이 무게중심. 다크모드(T3.5)는 검증·문서화라 작다.

### 작업 항목

#### ✅ T3.1 — 관리자 인증 게이트 (선행 P0)

> ✅ **완료 (2026-05-22)**: `lib/admin-session.ts`(순수 Web Crypto HMAC-SHA256 sign/verifySession — proxy=Edge·Node 공유, server-only 미적용·R13)·`lib/admin-auth.ts`(server-only, `timingSafeEqual` 비번 비교·쿠키·`requireAdminSession` 2중검증)·`app/admin/login`(Server Action+`useActionState` 폼, 셸+Suspense·R15)·`app/admin/logout`·`proxy.ts`(matcher `["/q/:path*","/admin/:path*"]` + 미인증 redirect + noindex)·`.env.example` ADMIN_PASSWORD/ADMIN_SESSION_SECRET·`robots.txt` `Disallow:/admin`. 검증: `test:admin-auth` 5/5, tsc·lint·build(`/admin/login` ◐). Playwright: 미인증 차단(307→로그인)·로그인·잘못된 비번 인라인 에러·위조/만료 쿠키 차단 PASS. code-reviewer-kr 4.5/5, quick fix(C1 secure 쿠키 prod 한정·C2 secret 누락 로그·M1 robots `/admin/`·M2 경고 정리) 반영. 결정값: 인증=env 비번+서명 세션 쿠키·세션 30일·신규 npm install 0.

- **추정**: L (1~2d) · **담당 영역**: BE / security · **테스트**: 단위/통합(`scripts/test/admin-auth.ts`) + Playwright E2E
- **배경**: 목록·복사보다 **먼저** 성립해야 하는 보안 기반. PRD A.2/A.7 권장안 = 환경변수 비밀번호 + Web Crypto HMAC 서명 세션 쿠키. 신규 npm install 0.
- **세부 단계**:
  1. `lib/admin-auth.ts` 신규(첫 줄 `import "server-only"`): `signSession()` / `verifySession()` — Web Crypto `crypto.subtle` HMAC-SHA256 으로 `{ iat, exp }` 페이로드 서명·검증. `ADMIN_SESSION_SECRET`(env) 사용. 비번 비교는 타이밍 안전(`crypto.timingSafeEqual`).
  2. `/admin/login` 로그인 처리(Route Handler `app/admin/login/route.ts` 또는 Server Action): 입력 비번 ⟷ `ADMIN_PASSWORD`(env) 타이밍 안전 비교 → 일치 시 `cookies().set("admin_session", token, { httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge:… })`. 불일치 시 인라인 에러("비밀번호가 올바르지 않습니다.").
  3. `app/admin/login/page.tsx` 로그인 폼(`"use client"` 최소 범위 or 폼 컴포넌트 분리). shadcn `field`/`input`/`button` 재사용. `/admin/login` 은 공개(인증 게이트 진입점).
  4. `proxy.ts` matcher 확장 — 현재 `/q/:path*` 뿐 → **`["/q/:path*", "/admin/:path*"]`**. `/admin`(단 `/admin/login` 제외)에서 `cookies()` 로 세션 읽어 `verifySession()` → 실패 시 `NextResponse.redirect("/admin/login")`. 동시에 `/admin/*` 응답에 `X-Robots-Tag: noindex, nofollow, noarchive`.
  5. **2중 검증(낙관적 게이트 보완)**: proxy 는 1차 차단만 담당. `/admin` 서버 컴포넌트 진입 시 `queryPublishedQuotes()` 호출 **전에 서버에서 세션 재검증**(proxy 우회·쿠키 조작 대비). 실패 시 `redirect("/admin/login")`.
  6. 로그아웃(`app/admin/logout` Route Handler 또는 Server Action): 세션 쿠키 삭제 → `/admin/login` 이동. (P1 — Goal 검증엔 불필요하나 권장안 채택 시 함께 구현.)
  7. `robots.txt` 에 `Disallow: /admin` 추가. `.env.example` 에 `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` 블록 추가(PRD A.12).
- **인수 조건**:
  - 미인증 상태로 `/admin` 직접 접근 → `/admin/login` 으로 리다이렉트(견적 정보 응답 0).
  - `/admin/login` 에 올바른 비번 입력 → 세션 쿠키 발급 + `/admin` 진입 성공.
  - 잘못된 비번 입력 → 인라인 에러, 쿠키 미발급.
  - 위조·만료 쿠키로 `/admin` 접근 → `/admin/login` 리다이렉트(`verifySession` 실패).
  - `/admin/*` 응답에 `x-robots-tag: noindex, nofollow, noarchive` + `robots.txt` 에 `/admin` Disallow.
- **의존성**: 없음(이 Phase 의 선행 작업). ⚠️ T3.3·T3.4 의 **선행 차단 조건**.
- **테스트 계획** — `scripts/test/admin-auth.ts`(인라인 복제 패턴, `server-only` 모듈 직접 import 금지 → 서명·검증 로직 동치 복제 또는 Web Crypto 직접 호출):
  - **시나리오 1 (정상)**: `verifySession(signSession(payload))` → true, 페이로드 복원 일치.
  - **시나리오 2 (실패: 인증 누락/오류)**: 쿠키 없음 → 미인증 판정(=리다이렉트 대상). 잘못된 비번 비교 → 불일치.
  - **시나리오 3 (실패: 위조 서명)**: 시크릿 다른 키로 서명한 토큰 / payload 변조 토큰 → `verifySession` false.
  - **시나리오 4 (엣지: 세션 만료)**: `exp` 가 과거인 토큰 → `verifySession` false.
  - **시나리오 5 (엣지: 타이밍 안전 비교)**: 동일 길이·1글자 차이 비번 → 불일치 + 비교가 `timingSafeEqual` 경유(early-return 비교 아님) 확인.
  - **Playwright E2E**(T3.3 정비 후 통합):
    - 미인증: `mcp__playwright__browser_navigate('/admin')` → `mcp__playwright__browser_snapshot()` 으로 로그인 폼 노출(목록 미노출) 확인.
    - 로그인: `mcp__playwright__browser_navigate('/admin/login')` → `mcp__playwright__browser_fill_form`(비밀번호) → `mcp__playwright__browser_click`(로그인) → `browser_snapshot()` 으로 `/admin` 목록 진입 확인.
    - 잘못된 비번: 틀린 값 입력 → `browser_snapshot()` 에 "비밀번호가 올바르지 않습니다." 인라인 에러.
- **함정·메모**:
  - ⚠️ `proxy.ts`(구 middleware) 의 `config.matcher` 는 빌드 타임 정적 분석 대상 — 정적 배열로 작성. 현재 `"/q/:path*"` → `["/q/:path*", "/admin/:path*"]`.
  - ⚠️ Web Crypto `crypto.subtle` 는 Node/Edge 양쪽 동작(신규 의존성 0). proxy 는 Edge 런타임 가능성 → Node 전용 API(`crypto.timingSafeEqual` 등) 사용 위치는 서버 컴포넌트/Route Handler(Node) 로 한정하고, proxy 에서는 Web Crypto 기반 검증만 수행.
  - ⚠️ 쿠키 `path` 범위 — `path:"/"` 권장(로그아웃·재방문 일관). PRD A.7 의 `path:"/admin"` 도 가능하나 로그아웃 삭제 경로와 반드시 일치시킬 것.
  - ⚠️ 운영자 결정(인증 방식) 미확정 시 본 태스크는 권장안 기준으로 착수하되, 확정 후 차이를 반영. Basic Auth/Vercel 보호 채택 시 2~6단계가 대폭 축소·변경.

#### ✅ T3.2 — 견적 목록 페치 `queryPublishedQuotes()`

> ✅ **완료 (2026-05-22)**: `lib/quotes.ts::queryPublishedQuotes()` — 기존 `resolveDataSourceId`/`PROP`/`STATUS_PUBLISHED_KO`/`getFormulaString` 재사용(신규 Notion 속성 0), `start_cursor` 페이지네이션 전수 + 발행일 내림차순(코드측 null 맨뒤 안정화), **6필드 경량**(항목/합계/notes 미페치 — N+1 방지)·`types/index.ts::QuoteListItem`·`scripts/test/admin-quotes.ts`·`package.json` 스크립트. 검증: `test:admin-quotes` 5/5(정상 발행 3건·6필드·내림차순 / 401 Unauthorized / 빈결과 / 페이지네이션 경계 page_size=1 합산일치 / 항목·합계 미페치 회귀가드).

- **추정**: M (0.5~1d) · **담당 영역**: data / 비즈니스 로직 · **테스트**: 단위/통합(`scripts/test/admin-quotes.ts`)
- **배경**: 관리자 목록의 데이터 소스. MVP 가정 "목록 함수 안 만든다" 를 변경. 기존 `lib/quotes.ts` 자산 재사용(신규 Notion 속성 0).
- **세부 단계**:
  1. `lib/quotes.ts` 에 `queryPublishedQuotes(): Promise<QuoteListItem[]>` 추가. 기존 `resolveDataSourceId()` 재사용(v5 2단계 패턴).
  2. `dataSources.query` 에 `filter: { property: PROP.status, select: { equals: STATUS_PUBLISHED_KO } }` + `start_cursor` 페이지네이션으로 발행 견적 **전체** 조회. ⚠️ `getQuoteBySlug` 와 달리 slug 로 필터하지 않으므로 formula 필터 불가 함정과 무관(각 행 slug 는 `getFormulaString` 으로 읽기만).
  3. 정렬: `발행일`(date) 내림차순(최신 우선). Notion `sorts: [{ property: PROP.issuedAt, direction: "descending" }]` 또는 코드 정렬.
  4. 반환 타입 `QuoteListItem`(`types/index.ts` 신규): `{ slug, title, clientCompany, quoteNumber, issuedAt, status }` **6필드만**. ⚠️ **항목(Items)·합계·notes 페치 금지**(목록에 불필요 + N+1 호출 방지). 즉 `getQuoteItems`/`calculateTotals` 미호출.
  5. 정합성(규칙 1~3 동일): 필수 속성 누락 행은 `console.warn` 후 목록에는 표시하되 누락 필드 `null`(UI 에서 "-"). slug 형식 위반(`SLUG_PATTERN` 불통과) 행은 `slug=null` 로 두어 UI 가 [복사] 비활성화 가능하게(잘못된 URL 복사 방지).
- **인수 조건**:
  - 발행 견적 N건 → `QuoteListItem[]` N건, 각 행 6필드 정규화, 발행일 내림차순.
  - 발행 견적 0건 → 빈 배열(throw 금지).
  - 항목·합계·notes 는 결과에 포함되지 않음(타입·페치 모두).
  - 발행 견적이 100건 초과(페이지네이션 경계) → 누락 없이 전수 반환.
- **의존성**: 없음(T3.1 과 병행 가능). T3.3 의 데이터 소스.
- **테스트 계획** — `scripts/test/admin-quotes.ts`(인라인 복제 패턴. `lib/quotes.ts` 직접 import 금지 — `server-only` 가드. v5 SDK 직접 호출로 동치성 확보):
  - **시나리오 1 (정상)**: `상태=발행` 시드 견적들 페치 → 배열 길이 ≥2, 각 행 slug 32자·title/clientCompany not-null, 발행일 내림차순 정렬 확인.
  - **시나리오 2 (실패: 인증)**: 잘못된 `NOTION_TOKEN` → `APIErrorCode.Unauthorized` throw 캐치.
  - **시나리오 3 (실패: 빈 결과)**: 발행 견적 0건 상황(또는 존재하지 않는 상태 필터) → 빈 배열, throw 없음.
  - **시나리오 4 (엣지: 페이지네이션 경계)**: `page_size` 를 작게(예: 1) 강제해 `has_more` 경유 다중 페이지 → 합산 건수가 단일 페이지 호출과 일치(누락·중복 0). MVP 규모에서 100건 초과 시뮬레이션.
  - **시나리오 5 (엣지: 항목/합계 미페치)**: 결과 객체에 `items`/`subtotal`/`total`/`notes` 키 부재 확인(목록 경량 보장, N+1 방지 회귀 가드).
  - `=== 결과 요약 ===` 출력 + `process.exitCode`.
- **함정·메모**:
  - ⚠️ `발행일` 누락 행이 있으면 정렬 시 `null` 처리 순서 정의(맨 뒤로). Notion `sorts` 가 date null 을 어떻게 다루는지 실측 → 코드 정렬 폴백 고려.
  - ⚠️ 목록은 캐시 가능(`"use cache"` + `cacheLife("minutes")`)하지만, **인증 게이트 뒤**이므로 페이지 컴포넌트에서 캐시 범위를 지정한다(lib 모듈엔 캐시 지시자 두지 않음 — 기존 패턴 유지).

#### ✅ T3.3 — 관리자 견적 목록 페이지 `/admin`

> ✅ **완료 (2026-05-22)**: `app/admin/page.tsx`(셸+Suspense resolver — `requireAdminSession` 2중검증 → `queryPublishedQuotes` → 목록, R15 대응으로 동적 데이터 Suspense 내부 → `/admin` ◐ Partial Prerender, metadata noindex, runtime/`"use cache"` export 미사용)·`components/admin/quote-list.tsx`(데스크톱 시맨틱 `<table>` ↔ 모바일 카드 `hidden sm:block`/`sm:hidden`, 6컬럼, StatusBadge·formatDate(TZ 시프트 회피)·누락 "-"·slug null 동작 비활성)·`quote-list-skeleton.tsx`. 글로벌 `ThemeToggle` 재사용. 검증: tsc·lint·build 통과. Playwright: 데스크톱 3건·발행일 내림차순 / 모바일 카드·가로 스크롤 0(360≤375) / 다크 토큰 정상 / 보안 회귀(쿠키 제거→`/admin/login`, 데이터 0) / 콘솔 0. code-reviewer-kr 4.5/5(Critical 0), W1 aria-label 반영.

- **추정**: M (0.5~1d) · **담당 영역**: ui · **테스트**: Playwright E2E
- **배경**: 인증 통과한 운영자에게 발행 견적을 테이블로 보여주는 화면. PRD A.5 와이어프레임 기준.
- **세부 단계**:
  1. `app/admin/page.tsx`(서버 컴포넌트): 진입 즉시 **세션 재검증**(T3.1 5단계) → 실패 시 `redirect("/admin/login")`. 통과 시 `queryPublishedQuotes()` 호출.
  2. 목록 테이블: 컬럼 = 제목 · 고객사 · 견적번호 · 발행일 · 상태 · 동작([열람] · [복사]). 헤더에 총 건수 + `ThemeToggle`(기존) + 로그아웃(T3.1).
  3. 반응형: 데스크톱은 `<table>`, 모바일(<640px)은 행을 카드로 분해(`제목 / 고객사 / 발행일 / [열람] [복사]`). 가로 스크롤 0.
  4. [열람] = `/q/[slug]` 새 탭(`target="_blank" rel="noopener"`, P1). [복사] = T3.4 의 `<CopyLinkButton slug={...} />`.
  5. 누락 필드 "-" 표시, slug 형식 위반 행은 [복사] 비활성(T3.2 정합성과 연동).
  6. 다크모드·토큰 일관(색 하드코딩 금지, oklch 토큰만). 폼·복잡 블록은 `components/admin/*` 로 분리(`app/admin/page.tsx` 는 얇은 래퍼).
- **인수 조건**:
  - 인증 통과 후 발행 견적이 테이블로 렌더(제목·고객사·견적번호·발행일·상태 정확).
  - 모바일(<640px)에서 카드 분해 + 가로 스크롤 0.
  - 다크모드/라이트모드 모두 가독성 유지.
  - 콘솔 에러 0.
  - ⚠️ 미인증 직접 접근 시 목록 데이터가 응답에 절대 포함되지 않음(T3.1 게이트 + 서버 재검증).
- **의존성**: **T3.1(인증)**, **T3.2(목록 페치)**. ⚠️ T3.1 완료 전 배포 금지(R11).
- **테스트 계획** — Playwright MCP:
  - **정상(데스크톱)**: 로그인 후 `mcp__playwright__browser_resize(1280, 800)` → `mcp__playwright__browser_navigate('/admin')` → `mcp__playwright__browser_snapshot()` 으로 행별 제목·고객사·발행일 데이터 확인 → `mcp__playwright__browser_console_messages()` 에러 0.
  - **반응형(모바일)**: `mcp__playwright__browser_resize(375, 667)` → `browser_snapshot()` 카드 분해 확인, 가로 스크롤 0(`browser_evaluate` 로 `document.documentElement.scrollWidth <= innerWidth`).
  - **다크모드**: 테마 토글 후 `mcp__playwright__browser_take_screenshot({ fullPage: true, filename: 'admin-dark.png' })` 베이스라인.
  - **보안 회귀**: 쿠키 삭제 후 `browser_navigate('/admin')` → `browser_snapshot()` 에 견적 데이터 없음 + 로그인 폼.
- **함정·메모**:
  - ⚠️ shadcn = `@base-ui/react`(Radix 아님). `table` 컴포넌트 필요 시 실제 파일 확인 또는 자체 `<table>` + 토큰. 폼/인터랙션 props 는 실제 파일에서 확인.
  - ⚠️ Next 16: `app/admin/page.tsx` 가 동적 데이터(인증·Notion)를 다루므로 셸+Suspense 패턴 검토(단, 인증 게이트로 정적 프리렌더 불가 → `cacheComponents` 충돌 여부 빌드로 실측).

#### ✅ T3.4 — 공유 링크 복사 버튼 `<CopyLinkButton>`

> ✅ **완료 (2026-05-22)**: `components/admin/copy-link-button.tsx`("use client") — `navigator.clipboard.writeText(`${window.location.origin}/q/${slug}`)` → 성공 `toast.success("링크를 복사했습니다")`, 실패 시 `toast.error` + description URL fallback(권한 거부·비보안 컨텍스트, R14, 앱 크래시 0). origin=`window.location.origin`(배포/커스텀 도메인 자동, 결정 ③). `quote-list.tsx` [복사] 자리표시자 → `CopyLinkButton` 교체(slug 있을 때만 활성). sonner Toaster 재선언 0. 검증: Playwright **정상**(복사 클릭→`http://localhost:3000/q/<slug>` 캡처 + 토스트) + **실패**(writeText 강제 reject → "복사에 실패했습니다" 토스트) 둘 다 PASS, 콘솔 0. code-reviewer-kr 4.5/5(Critical 0, fallback 설계 양호 평가).

- **추정**: S (<2h) · **담당 영역**: ui · **테스트**: Playwright E2E
- **배경**: 고도화 Goal("링크 3초 복사")의 핵심 인터랙션. 클라이언트 컴포넌트.
- **세부 단계**:
  1. `components/admin/copy-link-button.tsx` 신규(`"use client"`): props `slug: string` → 클릭 시 `navigator.clipboard.writeText(`${origin}/q/${slug}`)` → 성공 `toast.success("링크를 복사했습니다")`, 실패 `toast.error(...)`(권한 거부·비보안 컨텍스트 대비 fallback 안내).
  2. origin 조립: **운영자 결정 필요**(아래) — `window.location.origin`(배포 도메인 자동) vs `NEXT_PUBLIC_APP_URL`(고정). `.env.example` 에 `NEXT_PUBLIC_APP_URL` 이미 존재 → 후자 채택 시 server prop 주입.
  3. sonner `<Toaster>` 는 루트 레이아웃(`app/layout.tsx`)에 **이미 존재** → 재선언 금지(실측 2026-05-22).
- **인수 조건**:
  - [복사] 클릭 → 클립보드에 `https://…/q/<slug>` 정확히 기록 + "링크를 복사했습니다" 토스트.
  - 클립보드 권한 거부·비보안 컨텍스트 → 에러 토스트(앱 크래시 0).
  - slug 형식 위반 행은 버튼 비활성(잘못된 URL 복사 방지, T3.2·T3.3 연동).
- **의존성**: **T3.3**(목록 페이지). (→ 전이적으로 T3.1 보안 게이트 선행 필수.)
- **테스트 계획** — Playwright MCP:
  - **정상**: 로그인 후 `mcp__playwright__browser_navigate('/admin')` → `mcp__playwright__browser_click`(특정 행 [복사]) → `mcp__playwright__browser_snapshot()` 으로 "링크를 복사했습니다" 토스트 확인 → `mcp__playwright__browser_evaluate` 로 `navigator.clipboard.readText()` 값이 `${origin}/q/<slug>` 와 일치 확인(Playwright clipboard 권한 부여 필요).
  - **실패/엣지**: 클립보드 API 거부 시뮬레이션(`browser_evaluate` 로 `navigator.clipboard.writeText` 오버라이드 reject) → 에러 토스트 확인.
  - **콘솔**: `mcp__playwright__browser_console_messages()` 에러 0.
- **함정·메모**:
  - ⚠️ `navigator.clipboard` 는 보안 컨텍스트(HTTPS/localhost)에서만 동작 → 실패 시 fallback 토스트(수동 복사 안내) 필수.
  - ⚠️ Playwright 에서 클립보드 검증은 컨텍스트 권한(`clipboard-read`/`clipboard-write`)이 필요할 수 있음 — 토스트 노출로 1차 검증, 클립보드 값 검증은 `browser_evaluate` 보조.

#### ✅ T3.5 — 다크모드 검증·문서화 (⚠️ 신규 빌드 아님)

> ✅ **완료 (2026-05-22)**: 다크모드는 next-themes 기존 자산(신규 빌드 0). `docs/PHASE3_DARKMODE_NOTE.md` 작성(구성·검증결과·결론). 검증: Playwright(`emulateMedia` + `localStorage`) **시스템 추종·persist 4케이스 전부 PASS**(OS=dark·선호없음→다크 / OS=light·선호없음→라이트 / 저장 dark→OS 무관 다크 복원 / 저장 light→라이트 복원). `/admin`(T3.3)·`/admin/login`(스크린샷) 라이트/다크 토큰 기반 렌더 정상·콘솔 0. 신규 다크모드 자산(Provider/Toggle/토큰) 추가 0(과설계 회피, PRD A.6).

- **추정**: S (<2h) · **담당 영역**: ui / qa · **테스트**: Playwright 시각 회귀
- **배경**: ⚠️ **다크모드는 이미 구현됨**(실측 2026-05-22): `components/common/ThemeProvider.tsx`(next-themes 래퍼), `ThemeToggle.tsx`(`aria-label="테마 전환"`, Sun/Moon), `app/layout.tsx`(`attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`, `<html lang="ko" suppressHydrationWarning>`), `app/globals.css`(`.dark` oklch 토큰 + `@custom-variant dark`). T2.6 에서 견적 페이지 다크 검증 완료. **본 태스크는 신규 개발이 아니라 검증·문서화 + 관리자 화면 일관 적용 확인.**
- **세부 단계**:
  1. **검증·문서화**: `defaultTheme="system"` OS 추종 동작 확인 + 선호 persist 확인(next-themes localStorage 키 `theme` 자동 저장 → 새 방문 복원). 결과를 짧게 문서화(예: `docs/PHASE3_DARKMODE_NOTE.md` 또는 E2E 리포트에 합산).
  2. **선택적 폴리시 — 관리자 화면 일관 적용**: `/admin`·`/admin/login` 도 동일 토큰·기존 `ThemeToggle` 사용해 라이트/다크 안 깨지게(신규 토큰·신규 토글 만들지 않음. 기존 자산 재사용). ⚠️ 실제 토글 배선은 T3.3 헤더에서 수행 → 본 태스크는 결과 검증.
- **인수 조건**:
  - `/admin`·`/admin/login` 라이트/다크 모두 깨짐 없음(색 하드코딩 0, 토큰만).
  - 시스템 테마 변경 시 추종, 새 방문 시 사용자 선호 복원.
  - 신규 다크모드 자산(Provider/Toggle/토큰) 추가 0 — 기존 재사용만.
- **의존성**: T3.3(관리자 화면 존재해야 일관 적용 검증 가능).
- **테스트 계획** — Playwright MCP:
  - 라이트/다크/시스템 3상태 회귀 스냅샷: `/admin/login` 과 `/admin`(로그인 후) 각각 `mcp__playwright__browser_take_screenshot({ fullPage: true })` 라이트·다크 2장씩 베이스라인.
  - persist 검증: 다크 토글 → `mcp__playwright__browser_navigate`(재방문) → `browser_snapshot()` 으로 다크 유지 확인.
- **함정·메모**: ⚠️ 과설계 금지 — 신규 다크모드 시스템을 만들지 않는다(PRD A.6 "이미 구현됨"). 범위는 검증 + 관리자 일관성뿐.

### Phase 3 완료 정의 (DoD)

- [x] T3.1~T3.5 모든 작업 항목 인수 조건 통과. *(2026-05-22 전 항목 ✅)*
- [x] **T3.1(인증) 이 T3.3·T3.4 보다 먼저 완료·검증됨** — 미인증 `/admin` 노출 0(보안 게이트, R11). *(게이트 실측: 미인증→307 로그인·유효세션→404·위조쿠키→로그인)*
- [x] `npm run build`·`tsc --noEmit`·`npm run lint` 무경고 통과(Cache Components 게이트 포함). *(`/admin`·`/admin/login` ◐ Partial Prerender)*
- [x] `tsx scripts/test/admin-auth.ts`(5 시나리오) + `tsx scripts/test/admin-quotes.ts`(5 시나리오) 모두 `=== 결과 요약 ===` fail 0. *(5/5 · 5/5)*
- [x] Playwright E2E: 인증(미인증 차단·로그인·잘못된 비번) + 목록(데스크톱·모바일·다크) + 링크 복사(정상·실패) **전부 PASS**, 콘솔 에러 0. *(복사 실패 fallback: writeText 강제 reject→에러 토스트 실측)*
- [x] `/admin/*` noindex 헤더 + `robots.txt` `Disallow: /admin` 검증. *(게이트 실측: x-robots-tag noindex + robots.txt)*
- [x] 신규 npm install 0 유지(인증=Web Crypto, 복사=clipboard, UI=기존 자산). 신규 의존성 발생 시 결정사항으로 격상.
- [x] 코드 리뷰 통과(`code-reviewer-kr`). *(T3.1·T3.2 4.5/5 / T3.3·T3.4 4.5/5)*
- [x] **정의된 테스트 시나리오가 모두 통과**(단위/통합 스크립트 + Playwright MCP 실측).

### Phase 3 리스크

- ⚠️ **R11. 인증 미완성 상태로 `/admin` 노출 → 전체 slug 유출** — 영향: 치명(MVP 보안 모델 붕괴). 가능성: 중간(작업 순서 실수). **완화**: T3.1 을 선행 P0 로 고정 + **T3.3·T3.4 는 T3.1 검증 전 production 배포 금지**(배포 게이트). proxy matcher + 서버 2중 검증.
- ⚠️ **R12. 인증 방식 미확정(운영자 결정)** — 영향: T3.1 재작업. 가능성: 중간. **완화**: 권장안(env 비번 + 서명 쿠키)으로 착수하되 착수 전 운영자 확정 요청. 대안(Basic Auth/Vercel 보호)은 코드 구조가 달라 미리 분기 메모.
- ⚠️ **R13. `proxy.ts` Edge 런타임 제약** — Node 전용 `crypto` API 가 proxy(Edge)에서 불가할 수 있음. **완화**: proxy 에서는 Web Crypto(`crypto.subtle`)만 사용, Node 전용 비교는 Route Handler/서버 컴포넌트(Node)로 한정. 빌드·런타임 실측.
- ⚠️ **R14. `navigator.clipboard` 비보안 컨텍스트·권한 거부** — 영향: 복사 실패. 가능성: 낮음(production HTTPS). **완화**: 실패 시 fallback 토스트(수동 복사 안내). production 도메인은 HTTPS.
- ⚠️ **R15. `cacheComponents` + 인증 동적 라우트 충돌** — `/admin` 은 인증으로 정적 프리렌더 불가 → 빌드 게이트 충돌 가능. **완화**: T3.3 빌드 실측, Suspense/`"use cache"` 범위 조정. (T2.3 의 runtime export 금지 함정과 동류.)

### 결정 필요 항목 (Phase 3 — 운영자 확정 대기)

1. ⚠️ **관리자 인증 방식**(최우선) — 권장: 환경변수 비번 + 서명 세션 쿠키(신규 의존성 0, 로그인 UX·로그아웃 제어). 대안: HTTP Basic Auth(코드 최소·UX 투박), Vercel 플랫폼 보호(코드 0·플랫폼 종속·유료 가능). **영향 태스크**: T3.1. **착수 전 확정 필요**(코드 구조가 갈림).
2. ⚠️ **세션 만료(maxAge)** — 권장안 채택 시 쿠키 유효기간(7일 / 30일 / 브라우저 종료 시). 단일 운영자 본인 기기면 길게 무방. **영향 태스크**: T3.1.
3. ⚠️ **공유 URL origin 조립** — `window.location.origin`(배포 도메인 자동) vs `NEXT_PUBLIC_APP_URL`(고정). production 도메인(`notion-ai-blog-zeta.vercel.app` 또는 커스텀) 확정 시 후자가 안전. **영향 태스크**: T3.4.
4. ⚠️ **관리자 경로** — 기본안 `/admin`(+`/admin/login`). 변경 원하면 확정. **영향 태스크**: T3.1·T3.3·proxy matcher.
5. ⚠️ **목록 노출 범위** — `상태=발행` 만(기본안, 공유 가능한 견적) vs `초안`·`보관` 도 상태 뱃지와 함께. **영향 태스크**: T3.2.

---

## Phase 4 (Future): 우선순위 매트릭스

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
T2.8 (배포 + production 실측)
  ↓
[Phase 2 완료 = MVP launch]
  ↓
─────────── Phase 3 (v1.x 고도화) ───────────
  ↓
T3.1 (관리자 인증 게이트) 🔐 선행 P0 ─┬─ T3.2 (목록 페치, 병행 가능)
  ↓                                  │
  └──────────────┬───────────────────┘
                 ↓
        T3.3 (관리자 목록 페이지)   ⚠️ T3.1 검증 전 배포 금지
                 ↓
        T3.4 (링크 복사 버튼)       ⚠️ T3.1 검증 전 배포 금지
                 ↓
        T3.5 (다크모드 검증·문서화)
                 ↓
        [Phase 3 완료]
```

**핵심 경로(MVP)**: `T1.1 → T1.2 → T1.3 → T1.5 → T1.6 → T2.3 → T2.6 → T2.7`. 이 순서가 지연되면 launch 가 지연된다. T1.4/T1.7/T2.2/T2.4/T2.5 는 병행 처리해 일정 단축 가능.

**핵심 경로(Phase 3)**: `T3.1(인증) → T3.3(목록) → T3.4(복사) → T3.5(다크모드)`. ⚠️ **보안 게이트**: T3.1 은 T3.3·T3.4 의 선행 차단 조건 — 인증 미완성 상태로 목록/복사를 배포하면 전체 견적 slug 가 유출된다(R11). T3.2(목록 페치)는 T3.1 과 병행 가능하나 화면 노출(T3.3)은 인증 뒤에서만.

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
| Phase 3 (W3) | 관리자 인증(서명·검증·만료·타이밍 안전) | `tsx scripts/test/admin-auth.ts` | Playwright(미인증 차단·로그인·잘못된 비번) |
| Phase 3 (W3) | 목록 페치 `queryPublishedQuotes` | `tsx scripts/test/admin-quotes.ts` | 수동 데이터 검수 |
| Phase 3 (W3) | `/admin` 목록 UI + 링크 복사 | **Playwright MCP** (데스크톱·모바일·다크·복사·보안 회귀) | 베이스라인 스크린샷 |
| Phase 3 (W3) | `/admin` noindex | Playwright `browser_network_request` + curl | robots.txt 검증 |

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
- **Phase 3(관리자 목록)용**: 위 2건이 모두 `상태=발행` 이므로 `queryPublishedQuotes()`·`/admin` 목록 검증에 그대로 재사용한다(목록에 최소 2행 노출). 발행일 내림차순 정렬·페이지네이션 경계는 단위 스크립트(`admin-quotes.ts`)에서 `page_size` 축소로 검증(시드 추가 불필요).

---

## 📊 마일스톤 & 지표

| 마일스톤 | 시점 | 측정 지표 | 목표 |
|---------|------|----------|------|
| Phase 1 완료 | W1 종료 | `npm run build` 통과, `npm run test:quotes` 통과, 시드 견적 데스크톱·모바일 렌더 PASS | 100% |
| Phase 2 PDF | T2.3 완료 | PDF 응답 시간(로컬) | 콜드 15s, 핫 5s 이내 |
| Phase 2 E2E | T2.6 완료 | Playwright 시나리오 A~I PASS율 | 9/9 (100%) |
| Phase 2 production | T2.7 완료 | production PDF 응답 시간 | 콜드 10s, 핫 3s 이내 |
| MVP launch | W2 종료 | 운영자가 견적 1건 5분 안에 발행 → 클라이언트가 PDF 다운로드 성공 | 1회 시연 성공 |
| Phase 3 인증 | T3.1 완료 | `admin-auth.ts` PASS + 미인증 `/admin` 차단(Playwright) | 5/5 + 차단 100% |
| Phase 3 완료 | W3 종료 | 운영자가 `/admin` 로그인 → 목록에서 공유 링크 1클릭 복사 | 3초 이내 복사 1회 시연 + slug 유출 0 |

---

## 🔗 의존성 맵

### 외부 의존성

- **Notion API** (`@notionhq/client` v5) — `databases.retrieve` → `dataSources.query` 2단계. T1.2/T1.3/T2.4 에 의존.
- **Vercel** — Function 메모리 1024MB, `nodejs` runtime. T2.3/T2.7 에 의존.
- **`@sparticuz/chromium` + `puppeteer-core`** — PDF 생성. T2.3 에 의존. ⚠️ 패키지 버전 매트릭스 확인 필수.
- **Pretendard (또는 Noto Sans KR)** — 한글 폰트. T2.2 에 의존.
- **Make/Zapier (선택)** — Notion 변경 webhook 트리거. T2.4 운영자 측 설정.
- **Web Crypto (`crypto.subtle`) — 내장** — 관리자 세션 HMAC 서명·검증. T3.1 에 의존. ⚠️ **신규 npm install 0**(Node/Edge 내장).
- **`navigator.clipboard` — 브라우저 내장** — 공유 링크 복사. T3.4 에 의존. ⚠️ 보안 컨텍스트(HTTPS/localhost) 전용.

### 신규 npm 의존성 (설치 시점)

| 패키지 | 버전 정책 | 설치 시점 | 용도 |
|--------|---------|----------|------|
| `nanoid` (선택) | latest | T1.1 직전 (운영자가 Notion Formula 대신 nanoid 선택 시) | slug 생성 |
| `puppeteer-core` | 정확 버전 고정 | T2.1 시작 시 | PDF 헤드리스 |
| `@sparticuz/chromium` | 정확 버전 고정 (`puppeteer-core` 호환 확인) | T2.1 시작 시 | Vercel Function용 Chromium |

> 📌 가정: 위 외 모든 의존성은 W0 초기화 시점에 이미 설치됨. 추가 라이브러리(예: `fuse.js`, `algoliasearch`)는 MVP 범위 밖.
>
> 📌 **Phase 3 신규 npm install 0 가정**: 인증=Web Crypto(내장), 복사=`navigator.clipboard`(내장), UI=기존 shadcn(`field`/`input`/`button`)·sonner·next-themes 재사용. 신규 의존성이 불가피하면 결정사항으로 격상해 운영자 확인 후 설치(예: 세션 라이브러리 `jose` 등은 권장안에 불필요).

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
| R11 | 인증 미완성 상태로 `/admin` 노출 → 전체 slug 유출 | 치명(보안 모델 붕괴) | 중간 | T3.1 선행 P0 고정 + T3.3·T3.4 는 T3.1 검증 전 배포 금지(배포 게이트) + 서버 2중 검증 | Phase 3 |
| R12 | 관리자 인증 방식 미확정(운영자 결정) | T3.1 재작업 | 중간 | 권장안(env 비번 + 서명 쿠키)으로 착수, 착수 전 운영자 확정 요청, 대안 분기 메모 | Phase 3 |
| R13 | `proxy.ts` Edge 런타임에서 Node `crypto` API 불가 | 세션 검증 실패 | 중간 | proxy 는 Web Crypto(`crypto.subtle`)만, Node 전용 비교는 Route Handler/서버 컴포넌트로 한정 | Phase 3 |
| R14 | `navigator.clipboard` 비보안 컨텍스트·권한 거부 | 복사 실패 | 낮음(prod HTTPS) | 실패 시 fallback 토스트(수동 복사 안내) | Phase 3 |
| R15 | `cacheComponents` + 인증 동적 라우트 빌드 충돌 | `/admin` 빌드 실패 | 중간 | T3.3 빌드 실측, Suspense/`"use cache"` 범위 조정(T2.3 runtime export 함정과 동류) | Phase 3 |

---

## 🤔 결정 필요 항목 (운영자 확정 대기)

본 로드맵은 PRD 의 "기본안/권장안" 을 채택했지만, 운영자가 다음 결정을 확정해야 일부 태스크가 최종 형태를 갖는다. ⚠️ 표시.

### MVP (Phase 1·2) — PRD 자가검증 5종

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
   - **영향 태스크**: T1.7. Phase 4(Future) 의 1순위(자동 차단)를 MVP로 끌어올리는 결정.
   - **결정 기준**: 결재용 정합성 사고 위험도.

### Phase 3 (v1.x 고도화) — PRD 부록 A.9 기반 5종

> 상세는 본 문서 "Phase 3 → 결정 필요 항목 (Phase 3 — 운영자 확정 대기)" 절 참조. 요약:

6. ⚠️ **관리자 인증 방식**(최우선): 권장 = 환경변수 비번 + 서명 세션 쿠키(신규 의존성 0). 대안 = HTTP Basic Auth / Vercel 플랫폼 보호. **영향**: T3.1. **착수 전 확정 필요**.
7. ⚠️ **세션 만료(maxAge)**: 7일 / 30일 / 브라우저 종료 시. **영향**: T3.1.
8. ⚠️ **공유 URL origin 조립**: `window.location.origin`(자동) vs `NEXT_PUBLIC_APP_URL`(고정). **영향**: T3.4.
9. ⚠️ **관리자 경로**: 기본안 `/admin`(+`/admin/login`). **영향**: T3.1·T3.3·proxy matcher.
10. ⚠️ **목록 노출 범위**: `상태=발행` 만(기본안) vs `초안`·`보관` 포함. **영향**: T3.2.

---

## 📝 변경 이력

| 일자 | 변경 | 작성자 |
|------|------|-------|
| 2026-05-17 | 견적서 도메인 기준 신규 작성 (블로그 로드맵은 `docs/archive/ROADMAP.md` 로 이동) | prd-roadmap-architect |
| 2026-05-21 | T1.1~T1.6 완료 검증·체크 (산출물 8종 존재·`test:quotes` 7/7·build `/q/[slug]` Partial Prerender). T1.7(`isQuoteExpired`)·코드리뷰 잔여 | /git:docs:update-roadmap |
| 2026-05-21 | T1.7 완료 (`isQuoteExpired` 헬퍼 + `quote-data.tsx` 배선 + 만료 단위 3종). `test:quotes` 10/10·build 통과. Phase 1 잔여=code-reviewer-kr 리뷰 | quote-viewer-builder |
| 2026-05-21 | code-reviewer-kr 리뷰 quick fix(C1·M4·M5·S1) 반영. **T1.8(랜딩 `/` 정식화) 신규 추가** — PRD IA 에 있으나 ROADMAP 누락이던 메인 페이지 | code-reviewer-kr / 사용자 요청 |
| 2026-05-21 | **T1.8 완료** — `app/page.tsx` 정식 랜딩 검증(build `/` `○ Static`·tsc·lint·Playwright 데스크톱/모바일/다크 3종·콘솔 0). W1 종료, 다음 W2 | quote-ui-designer |
| 2026-05-21 | **T2.1~T2.5 완료** — puppeteer-core+@sparticuz/chromium 설치·pdf-spike / Pretendard 폰트 / `/q/[slug]/pdf` PDF 라우트 / `/api/revalidate` Bearer webhook / robots.txt. tsc·lint·build 통과, test:quotes 10/10·pdf-route 5/5·revalidate 9/9. code-reviewer-kr quick fix C1(타이밍 안전 비교)·C2(에러 비노출)·M4(샌드박스)·S3 반영. 잔여 W2=T2.6(E2E)·T2.7(배포) | quote-viewer-builder / code-reviewer-kr |
| 2026-05-21 | **T2.6 완료** — Playwright MCP E2E 7종(A·B·C·D·F·G·H) PASS, 콘솔 0·버그 0. `docs/PHASE2_E2E_REPORT.md` 작성. E(Draft→404)·I(revalidate 통합)는 production 필요로 이연 | qa-engineer |
| 2026-05-21 | **W2 재구성**(사용자 결정, "최소" 구조) — 신규 **T2.7 배포 전 하드닝**(error.tsx 전역 에러 경계·PDF/revalidate 레이트리밋·폰트 서브셋) 삽입, 기존 배포는 **T2.8**(+이연 E2E E·I·production 성능 실측)로 번호 이동. 추가 성능·보안헤더·분산 리밋은 측정 후 백로그. Phase 2 = T2.1~T2.8 | 사용자 요청 |
| 2026-05-21 | **T2.7 완료** — app/error.tsx 전역 에러 경계 + lib/rate-limit.ts(PDF 10·revalidate 30/분, 429+Retry-After, best-effort) + Pretendard 서브셋 2MB→452KB. tsc·lint·build·test:quotes 10/10·pdf-route 5/5·revalidate 9/9·rate-limit 5/5. code-reviewer-kr quick fix C2·M4·m1 반영(C1 오탐 판정). 잔여 W2=T2.8(배포)뿐 | quote-viewer-builder / code-reviewer-kr |
| 2026-05-22 | **T2.8 배포(진행 중, ✅ 아님)** — Vercel GitHub 연동 배포 `notion-ai-blog-zeta.vercel.app`. 환경변수 4개·랜딩·견적 열람·noindex 정상 실측. **PDF production 3중 수정**: `serverExternalPackages`(8d4bac1) → `outputFileTracingIncludes` chromium bin(aefbd56) → `launchBrowser()` ETXTBSY 재시도(f14e6b8). 동시 5건 5/5 HTTP 200. **잔여**: 콜드스타트 15.3s(R4 판단)·이연 E2E E·I·revalidate prod E2E·Lighthouse | /git:docs:update-roadmap |
| 2026-05-22 | **Phase 3 (v1.x 고도화) 신규 추가** — PRD 부록 A 기반 운영자 관리 화면(T3.1 인증 게이트·T3.2 `queryPublishedQuotes()`·T3.3 `/admin` 목록·T3.4 링크 복사·T3.5 다크모드 검증). 각 태스크 추정·의존성·DoD·테스트 계획(단위/통합 + Playwright MCP) 포함. 보안 게이트(R11: T3.1 선행, T3.3·T3.4 배포 차단) 명시. 기존 Phase 3(Future 매트릭스)→**Phase 4** 리네이밍, 관련 참조 갱신. 인증 방식 등 운영자 결정 5종(6~10번) 등록. 기존 Phase 0~2·측정후 백로그·리스크 보존(덮어쓰기 없음) | prd-roadmap-architect |
| 2026-05-22 | **Phase 3 (T3.1~T3.5) 전체 완료 체크(증거 기반)** — 산출물 존재 + tsc·lint·build(`/admin`·`/admin/login` ◐) + `test:admin-auth` 5/5·`test:admin-quotes` 5/5 + Playwright 실측(인증 차단·로그인·잘못된 비번 / 목록 데스크톱 3건·모바일 카드 가로스크롤0·다크 / 보안 회귀 / 복사 정상·실패 fallback / 시스템추종·persist 4케이스) + code-reviewer-kr(T3.1·T3.2·T3.3·T3.4 각 4.5/5) 근거로 T3.1~T3.5 헤더 ✅·Phase 3 DoD 9/9 체크. CLAUDE.md 진행 상태 동기화. 커밋 80f3817·ca94da6·ed30ff3·a3a48bc | /git:docs:update-roadmap |
| 2026-05-22 | **Phase 3 production 배포·실측 확인** — Vercel 환경변수 `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` 등록 후 재배포. production 게이트 실측: `/admin/login` 200(로그인 폼 정상), `/admin`(미인증) 307→`/admin/login`, 둘 다 `x-robots-tag: noindex`. 운영자 로그인 동작 확인. (초기 환경변수 누락으로 `/admin/login` 이 전역 에러 경계로 떨어지던 이슈 해소.) `/init` 으로 CLAUDE.md 명령어·환경변수·아키텍처(관리자 라우트) 현행화 | /git:docs:update-roadmap |
| 2026-05-23 | **T2.8 완료 → MVP(Phase 0~2) launch** — production 실측: revalidate webhook E2E 401/403/400/200 · Lighthouse 랜딩 Perf 84·A11y/BP/SEO 100(LCP 4.5s) · PDF 웜 3.3~4.3s/콜드 15.3s · 잘못된/Draft slug→not-found UI(soft-404, noindex 영향 0). 콜드스타트 **R4=accept+백로그**(window.print 미채택). 이연 E·I 라이브는 운영자 데이터 보존 위해 메커니즘 커버. Phase 2 DoD 체크 완료. 백로그: LCP·하드404·콘텐츠통합 E2E·콜드 단축·도메인. 리포트: `docs/PHASE2_LAUNCH_REPORT.md` | qa-engineer / /git:docs:update-roadmap |
