# Notion `Invoice` + `Items` DB 셋업 가이드 (T1.1)

> **대상**: 운영자 1회 작업. 이 문서대로 Notion 워크스페이스에 `Invoice` Database + `Items` Database 2개를 만들고, 시드 견적 2건과 항목 행을 입력한 뒤 `.env.local` 을 채운다.
>
> **결정 기록** (2026-05-17 사용자 확정, 변경 시 본 문서·`CLAUDE.md`·`lib/quotes.ts` 동시 갱신):
> - **DB 분리**: Invoice + Items 2개 DB (PRD 자가검증 3번 대안)
> - **Relation 방향**: Items 에 Invoice 속성(Relation, 일대다)
> - **Slug**: Notion `Formula` 자동 생성 (`replaceAll(id(), "-", "")`)
> - **부가세 기본값**: 10%
> - **총 금액 표시**: Notion 표에도 자동 표시 (옵션 B) — Items 의 `Amount`(Formula) + Invoice 의 `TotalAmount`(Rollup). **단 코드는 Notion 값 무시하고 자체 계산** (SSOT 보존, 표시용으로만)
> - **`ClientContact` 제외** (MVP 범위 밖, Future)
> - 도메인 명칭: DB 이름만 영문, 프로젝트/라우트/UI 텍스트·코드 식별자는 "견적서" 유지

---

## 사전 준비 — Notion Integration 생성

1. https://www.notion.so/profile/integrations 접속
2. **New integration** → 이름 `Quote Viewer (Dev)`, 워크스페이스 선택, **Internal** 타입
3. 생성 후 **Internal Integration Secret** 복사 (`ntn_` 또는 `secret_` 접두) → `.env.local` 의 `NOTION_TOKEN`

> 블로그 시절 Integration 재사용 가능 — 새 Invoice/Items DB 에 connect 만 추가 (Step 6).

---

## Step 1. `Invoice` DB 생성

1. Notion 워크스페이스에 빈 페이지 (예: `Quote Viewer Workspace`)
2. 본문에 `/database` → **Database — Full page**
3. 이름: **`Invoice`**

### Step 1-1. 사장님 입력 9속성 정의 (정확히 이 이름·타입)

| # | 속성 | 타입 | 옵션·기본값 |
|---|------|------|------------|
| 1 | `Title` | Title | Notion 기본 `Name` 을 우클릭 → Edit property → 이름만 `Title` 로 변경 |
| 2 | `Status` | **Select** | 옵션 3개 정확히: `Draft` / `Published` / `Archived` |
| 3 | `QuoteNumber` | Text | 예: `Q-2026-0001` |
| 4 | `ClientCompany` | Text | 고객사명 |
| 5 | `IssuerCompany` | Text | 본인 회사명 |
| 6 | `IssuedAt` | Date | 발행일 |
| 7 | `ValidUntil` | Date | 유효기간 |
| 8 | `TaxRate` | Number | **Default value = 10** |
| 9 | `Notes` | Text | 여러 줄 입력 가능 |

> `Slug`·`Items`·`TotalAmount` 3개 자동 컬럼은 Step 4·5·7 에서 추가.

---

## Step 2. `Items` DB 생성

같은 워크스페이스에 새 페이지(또는 같은 페이지 아래) → `/database` → **Database — Full page**. 이름: **`Items`**.

### Step 2-1. 6속성 정의

| # | 속성 | 타입 | 비고 |
|---|------|------|------|
| 1 | `Name` | Title | 항목명. 예: `로고 디자인` (Notion 기본 `Name` 그대로 사용 OK) |
| 2 | `Quantity` | Number | 수량 |
| 3 | `UnitPrice` | Number | 단가 (원 단위 정수) |
| 4 | `Note` | Text | 비고 (선택) |

> `Invoice`(Relation) 와 `Amount`(Formula) 2개는 Step 3·4 에서 추가.

### Step 2-2. `Invoice` Relation 추가 (Items → Invoice 일대다)

1. Items DB 에서 `+ Add a property` → 이름 `Invoice` → Type **Relation**
2. **Related to** 클릭 → 위에서 만든 `Invoice` DB 선택
3. **Limit** 을 `No limit` 으로
4. **Show on Invoice** 체크 → Invoice 표에 역참조 컬럼 자동 생성됨 (UI 편의)
5. **Add relation**

→ 이 시점에 Invoice DB 페이지에 가보면 자동으로 `Items` 라는 컬럼이 새로 생겨있다 (이름은 Notion 자동, 보통 "Related to Items"). 다음 Step 4 에서 이름 정리.

### Step 2-3. `Amount` Formula 추가 (자동 계산)

1. Items DB 에서 `+ Add a property` → 이름 `Amount` → Type **Formula**
2. **Edit formula** 클릭 → 수식 입력:
   ```
   Quantity * UnitPrice
   ```
   (Notion 신 Formula 문법. 만약 안 되면 구 문법 `prop("Quantity") * prop("UnitPrice")` 사용)
3. **Done**
4. **Number format** 을 원하면 `Number with commas` 또는 `Won` 설정 (표시용)

→ 각 Items 행에 `Amount` 가 자동 계산되어 표시됨.

---

## Step 3. Invoice 표의 자동 역참조 컬럼 이름 정리

Step 2-2 에서 Items 에 `Invoice` Relation 을 만들 때 "Show on Invoice" 를 체크했으므로 Invoice DB 에 역참조 컬럼이 자동 생성됨.

1. Invoice DB 로 이동
2. 자동 생성된 컬럼(보통 `Related to Items DB` 같은 이름) 우클릭 → **Edit property**
3. 이름을 `Items` 로 변경 (타입은 Relation, 그대로 둠)

→ 이 `Items` 컬럼은 다음 Step 4 의 Rollup 이 참조하는 대상.

---

## Step 4. Invoice 에 `TotalAmount` Rollup 추가 (자동 총 금액)

1. Invoice DB 에서 `+ Add a property` → 이름 `TotalAmount` → Type **Rollup**
2. 클릭해서 설정창 열기:
   - **Relation**: `Items` (Step 3 에서 이름 정리한 컬럼)
   - **Property**: `Amount` (Items 의 Formula 컬럼)
   - **Calculate**: `Sum`
3. **Number format**: `Won` 또는 `Number with commas` (표시용)

→ 견적 1건마다 항목들의 `Amount` 합계가 자동 표시됨.

> ⚠ 이 값은 **운영자 UI 표시용**. 코드(`lib/quotes.ts`)는 이 값을 절대 읽지 않고 항상 자체 계산 (PRD 정합성 규칙 6, 이중 진실 원천 방지).

---

## Step 5. Invoice 에 `Slug` Formula 추가 (URL 자동 생성)

1. Invoice DB 에서 `+ Add a property` → 이름 `Slug` → Type **Formula**
2. **Edit formula** → 수식 입력:
   ```
   replaceAll(id(), "-", "")
   ```
3. **Done**

→ 각 Invoice 행에 32자 영숫자 hex 가 자동 표시됨 (이게 클라이언트가 받는 견적서 URL 끝자리).

> ⚠ Slug 가 Formula 타입이므로 `lib/quotes.ts` 필터는 `formula: { string: { equals: ... } }` 로 호출 (T1.2-fetcher 단계 함정 노트).

---

## Step 6. Integration 을 두 DB 모두에 connect

> ⚠ Integration 권한 부여는 **API 로 불가능**. Notion UI 에서 **두 DB 각각** 수행.

각 DB 페이지에서:
1. 우상단 **···** → **Connections** (한국어: **연결**)
2. **Add connections** → `Quote Viewer (Dev)` 선택 → **Confirm**

Invoice·Items 둘 다 connect 안 하면 항목 페치가 `ObjectNotFound`.

---

## Step 7. 시드 입력 (Invoice 2건 + Items 행 3~5건)

### 시드 ① 정상 견적 (active)

**Invoice DB 새 행**:

| 속성 | 값 |
|------|-----|
| `Title` | `[regression-seed-active] ABC社 로고 견적` |
| `Status` | `Published` |
| `QuoteNumber` | `Q-2026-0001` |
| `ClientCompany` | `ABC 주식회사` |
| `IssuerCompany` | `Quote Viewer Dev` |
| `IssuedAt` | `2026-05-17` |
| `ValidUntil` | `2027-12-31` (미래) |
| `TaxRate` | `10` (자동) |
| `Notes` | `결제 조건: 계약 후 30일 내` |
| `Slug` | (자동) — 32자 hex 자동 생성됨, **복사해서 메모** (`SEED_SLUG_ACTIVE`) |

**Items DB 새 행 2개**:

| Name | Invoice | Quantity | UnitPrice | Note | Amount |
|------|---------|----------|-----------|------|--------|
| 로고 디자인 | `[regression-seed-active]` 선택 | 1 | 1500000 | 시안 3안 | (자동) 1,500,000 |
| 명함 디자인 | `[regression-seed-active]` 선택 | 2 | 200000 |   | (자동) 400,000 |

→ Invoice 표로 돌아가면 `TotalAmount` 가 `1,900,000` 으로 자동 표시되어 있어야 함.

### 시드 ② 만료 견적 (expired)

**Invoice DB 새 행**:

| 속성 | 값 |
|------|-----|
| `Title` | `[regression-seed-expired] XYZ社 만료 견적` |
| `Status` | `Published` |
| `QuoteNumber` | `Q-2024-0099` |
| `ClientCompany` | `XYZ 주식회사` |
| `IssuerCompany` | `Quote Viewer Dev` |
| `IssuedAt` | `2024-01-01` |
| `ValidUntil` | `2024-01-31` (과거 = 만료) |
| `TaxRate` | `10` |
| `Slug` | (자동) — 복사해서 메모 (`SEED_SLUG_EXPIRED`) |

**Items DB 새 행 1개**:

| Name | Invoice | Quantity | UnitPrice |
|------|---------|----------|-----------|
| 컨설팅 (만료) | `[regression-seed-expired]` 선택 | 1 | 500000 |

---

## Step 8. `.env.local` 마무리

남은 자리표시자 2개(`SEED_SLUG_ACTIVE` / `SEED_SLUG_EXPIRED`)를 Step 7 에서 복사한 값으로 교체:

```
SEED_SLUG_ACTIVE=<정상 시드의 Slug 셀 값>
SEED_SLUG_EXPIRED=<만료 시드의 Slug 셀 값>
```

DB ID 2종·Token·Revalidate Secret 은 이미 채워짐.

---

## 검증 체크리스트 (Definition of Done)

- [ ] (a) Invoice DB 가 9개 입력 컬럼 + 3개 자동 컬럼(Slug, Items, TotalAmount) = **12개** 정확히 정의됨
- [ ] (b) Items DB 가 5개 입력 컬럼 + 1개 자동 컬럼(Amount) = **6개** 정확히 정의됨
- [ ] (c) `Slug` 가 Formula(`replaceAll(id(), "-", "")`) 로 32자 hex 자동 표시
- [ ] (d) `Amount` 가 Formula(`Quantity * UnitPrice`) 로 자동 계산
- [ ] (e) `TotalAmount` 가 Rollup(Items → Amount → Sum) 으로 자동 합계 표시
- [ ] (f) Integration 이 Invoice DB + Items DB **두 곳 모두** 에 connect
- [ ] (g) 정상 시드 + 만료 시드 2건 모두 `Status=Published`
- [ ] (h) 각 시드의 Items 행이 Invoice Relation 으로 연결됨
- [ ] (i) `.env.local` 의 자리표시자 4개(DB ID 2종 + Slug 2종) 모두 실제 값으로 교체됨

**간접 검증**: T1.2-test 시나리오 1 (정상 페치) PASS = (a)·(c)·(f)·(g)·(i) 충족, T1.3-test 시나리오 1 PASS = (b)·(d)·(h) 충족.

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `APIErrorCode.ObjectNotFound` (Invoice) | Invoice DB 에 Integration connect 안 됨 | Step 6 재수행 (Invoice 쪽) |
| `APIErrorCode.ObjectNotFound` (Items) | Items DB 에 Integration connect 안 됨 | Step 6 재수행 (Items 쪽) |
| 항목 표가 견적서 페이지에 비어있음 | Items 행의 `Invoice` Relation 이 비어있음 | 해당 Items 행에서 Invoice 컬럼 선택 |
| Items.Amount 가 표시 안 됨 | Quantity 또는 UnitPrice 가 비어있음 | 두 값 모두 숫자 입력 |
| Invoice.TotalAmount 가 0 또는 빈칸 | (1) Rollup 의 Relation 이 잘못된 컬럼 (2) Property 가 Amount 가 아님 | Step 4 재수행, Rollup 설정 확인 |
| `Slug` 가 빈칸 | Formula 수식 오타 | Step 5 의 `replaceAll(id(), "-", "")` 정확히 입력 |
| Notion Formula 수식 에러 | 신 vs 구 문법 차이 | `prop("Quantity") * prop("UnitPrice")` 구 문법으로 시도 |
| `dataSources.query` 가 0건 반환 (Invoice 필터) | Slug 필터를 `rich_text` 로 호출 중 | T1.2-fetcher 에서 `formula: { string: { equals } }` 로 수정 |
| Items 정렬이 입력 순서와 다름 | Notion 기본 정렬이 다를 수 있음 | `lib/quotes.ts` 에서 `sorts: [{ timestamp: "created_time", direction: "ascending" }]` 명시 |
