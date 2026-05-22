# 노션 기반 견적서 웹뷰어 + PDF 다운로드 PRD

> 작성일: 2026-05-17 (MVP) · 2026-05-22 (v1.x 고도화 추가)
> 작성자: prd-generator-kr (시니어 서비스 기획자)
> 양식 출처: `docs/MVP PRD 양식.md`, 스타일 참고: `docs/NOTION_BLOG_PRD.md`

> **문서 구성 안내**
> - 본 문서의 **본문(Overview ~ 자가 검증)** 은 **MVP** (2026-05-17 작성, W0~W2 구현·Vercel 배포 완료. production: `notion-ai-blog-zeta.vercel.app`) 내용이다. **수정하지 않고 그대로 보존**한다.
> - 문서 맨 아래 **[부록 A. v1.x 고도화](#부록-a-v1x-고도화-2026-05-22)** 섹션이 MVP **이후** 추가되는 고도화 기능 3종(관리자 견적 목록 / 목록 내 링크 복사 / 다크모드 검증)을 담는다.
> - ⚠️ v1.x 의 **관리자 견적 목록** 기능은 MVP 의 핵심 가정 2가지("운영자 전용 화면을 만들지 않는다", "목록 조회 함수를 만들지 않는다")를 의도적으로 뒤집는다. 상세는 부록 A 참조.

---

## Overview

### What
운영자(견적 발행자)가 **Notion에 작성한 견적서**를, 클라이언트(고객)가 **로그인 없이 공유 URL로 열람**하고 **버튼 한 번에 PDF로 다운로드**할 수 있게 만드는 웹 서비스.
Notion 원본 UI는 노출되지 않으며, 견적서 전용 레이아웃으로 깔끔하게 렌더링된다.

### Who
- **운영자(발행자)**: 디자인·개발·컨설팅 등 프로젝트 기반 외주 일을 하는 1인~소규모 사업자. Notion으로 이미 업무를 정리하고 있고, 월 5~10건의 견적을 보낸다.
- **클라이언트(수신자)**: 견적을 받아 사내 결재·계약 검토용으로 PDF가 필요한 의사결정자. 디지털 도구에 능숙하지 않을 수 있으며, 모바일에서 먼저 열어보는 경우가 많다.

### Why
- 운영자: 한글·워드·구글 닥스로 견적서를 매번 만드는 작업이 번거롭고, 수정할 때마다 새 파일을 다시 보내야 한다. 이미 Notion으로 프로젝트를 관리하고 있으니 **"한 곳에서 작성, 링크로 공유, 자동으로 최신"** 이 가능해야 한다.
- 클라이언트: 받은 견적을 사내 결재에 올리려면 결국 **PDF가 필요**하다. 그러나 별도 회원가입·앱 설치를 요구받으면 부담을 느낀다. URL만 누르면 바로 보이고, PDF 받기 한 번이면 끝나야 한다.

### Goal
**운영자는 견적 1건을 5분 안에 만들어 링크로 공유할 수 있고, 클라이언트는 링크를 받은 즉시 PC·모바일 어디서든 견적서를 열람한 뒤 결재용 PDF를 1회 클릭으로 받아 사내에 올릴 수 있다.**

### How
1. Notion에 견적 전용 DB 1개(`Quotes`)를 운영자가 직접 만든다.
2. 견적 행 1개 = 견적서 1건. `Status=Published`로 바꾸면 추측 불가능한 무작위 slug를 가진 공유 URL이 활성화된다.
3. 클라이언트가 URL을 열면 견적서 전용 레이아웃(회사 정보·고객사·항목 표·합계·유효기간)이 렌더링된다. Notion UI는 노출되지 않는다.
4. "PDF 다운로드" 버튼 1개 → A4 한 장 분량의 깔끔한 PDF 파일이 받아진다.
5. Notion에서 견적 내용을 수정하면 on-demand revalidate로 웹·PDF 모두 자동 반영된다.

---

## Context

### User Persona

**P1. 운영자 — 박상준 (35세, 디자인 에이전시 대표)**
- 직원 3명 규모. Notion으로 프로젝트·일정·고객 관리를 모두 한다.
- 월 5~10건의 견적을 직접 발행한다. 지금은 구글 닥스 템플릿에 매번 복붙 → PDF 변환 → 메일·카톡 전송.
- 페인포인트: 견적을 보낸 뒤 항목·금액이 바뀌면 PDF를 다시 만들어 재전송해야 한다. 클라이언트가 어느 버전을 보고 있는지 추적이 안 된다.
- 디지털 숙련도: 높음. Notion API·Vercel 같은 용어를 이해한다.

**P2. 클라이언트 — 김혜진 (40대, 중소기업 대표)**
- 외주 에이전시에 견적을 의뢰한 의사결정자. 받은 견적을 사내 회계·총무팀에 전달해 결재를 올린다.
- 디지털 숙련도: 낮음~중간. 회원가입·앱 설치를 강하게 거부한다.
- 사용 환경: 카톡으로 받은 링크를 **휴대폰에서 먼저** 연다. 결재 올릴 때만 PC로 다시 연다.
- 페인포인트: 링크가 깨지거나, 모바일에서 표가 옆으로 잘리거나, PDF가 화질이 떨어져서 출력했을 때 보기 안 좋을까 걱정한다.

### User Flow

**운영자 흐름**
1. Notion에서 `Quotes` DB 새 행 추가 → 고객사·항목·금액·유효기간 입력
2. `Status` → `Published`로 변경
3. DB의 `Public URL` 속성에서 공유 링크 복사 (또는 Notion 화면의 링크 영역에서 복사)
4. 카톡·이메일로 클라이언트에게 전달
5. 수정 사항 발생 → Notion에서 값만 고침 → 동일 URL이 최신 내용으로 자동 갱신

**클라이언트 흐름**
1. 카톡·이메일로 받은 URL 클릭 → 모바일/PC 브라우저에서 견적서가 즉시 열림 (로그인·가입 없음)
2. 항목·합계·유효기간 확인
3. "PDF 다운로드" 버튼 클릭 → A4 1~2장 PDF가 즉시 받아짐
4. 사내 결재 시스템에 PDF 첨부 → 결재 진행

### Use Cases

- **UC1. 운영자 — 새 견적 발행**
  - 유저: 박상준 (운영자)
  - 목표: "ABC社" 대상 로고 디자인 견적 1건 발행
  - 시나리오: Notion `Quotes` DB → 새 행 → 항목/단가/수량 입력 → `Status=Published` → 공유 URL을 카톡으로 전송. 전체 5분 이내.

- **UC2. 운영자 — 발행 후 금액 수정**
  - 유저: 박상준
  - 목표: 클라이언트가 항목 1개 빼달라고 요청 → 수정 반영
  - 시나리오: Notion 행에서 해당 항목 삭제 → 합계 자동 재계산 → 30초~1분 내 동일 URL에 최신 견적 반영. 클라이언트에게 "같은 링크에서 다시 확인 부탁드립니다" 한 줄만 전달.

- **UC3. 클라이언트 — 모바일에서 첫 확인**
  - 유저: 김혜진 (클라이언트)
  - 목표: 카톡으로 받은 견적 즉시 확인
  - 시나리오: 카톡 메시지 링크 탭 → 인앱 브라우저에서 열림 → 견적서가 모바일 폭에 맞게 표시 → 합계·유효기간 확인 → 일단 "확인했다"고 답장.

- **UC4. 클라이언트 — PC에서 PDF 받아 결재 진행**
  - 유저: 김혜진
  - 목표: 사내 결재용 PDF 확보
  - 시나리오: PC 브라우저에서 같은 URL 재오픈 → "PDF 다운로드" 클릭 → `견적서_ABC社_20260517.pdf` 다운로드 → 사내 그룹웨어에 첨부.

### Assumptions
- **킬링포인트**: "Notion에서 한 번 쓰면 끝. 수정도 같은 링크." 운영자가 별도 PDF 편집기를 열 필요가 없다.
- **장점**: 운영자는 도구 추가 학습 부담 0. 클라이언트는 가입·앱 설치 0.
- **단점**: Notion DB 스키마를 운영자가 직접 만들어야 한다 (초기 1회 설정 부담). MVP에서는 운영자가 1명 또는 소수라고 가정해 멀티 테넌트(여러 회사·여러 발행자) 기능을 만들지 않는다.
- **만족 가설**: 운영자가 견적 발행 시간을 기존 대비 절반 이하로 줄이고, 클라이언트의 "PDF 어떻게 받아요?" 질문이 0건이 된다.
- **불만족 가설**: 표 디자인이 기성 견적서 템플릿보다 단조로워 보일 수 있다 → MVP에서는 "깔끔하고 결재 통과되는 수준"을 목표로 하고, 디자인 옵션·로고 업로드는 Future.

---

## Output

### 주요 기능 명세서

| 기능명 | 설명 | 우선순위 | 비고 |
|---|---|---|---|
| Notion 견적 데이터 페치 | `@notionhq/client` v5 + `dataSources.query`로 `Quotes` DB 조회 | P0 | 기존 `lib/notion.ts` 패턴 재사용 |
| 견적서 전용 렌더 페이지 | `/q/[slug]` 라우트. 회사 정보·고객사·항목 표·합계·유효기정 영역 | P0 | Notion UI 미노출 |
| 항목·합계 자동 계산 | 수량 × 단가 = 행 합계, 행 합계 누적 = 소계, 소계 + 부가세 = 총합계 | P0 | Notion `formula`로 처리하거나 페치 후 코드 계산 |
| PDF 다운로드 버튼 | "PDF 다운로드" 클릭 → A4 PDF 생성·다운로드 | P0 | 생성 방식은 [기술 결정] 참조 |
| 추측 불가 URL (slug) | 32자 이상 무작위 hex/nanoid를 `Slug` 속성에 저장 | P0 | URL 외 인증은 Future |
| 발행 상태 게이트 | `Status=Published` 만 노출. `Draft`/`Archived`는 404 | P0 | |
| 만료 견적 표시 | `ValidUntil` 지난 견적은 본문 상단에 "유효기간 만료" 배너 노출(열람은 허용) | P0 | 차단은 Future |
| 모바일 반응형 | 항목 표가 좁은 화면에서 가로 스크롤 또는 카드형으로 전환 | P0 | Tailwind v4 기본 |
| on-demand revalidate webhook | Notion 외부 자동화(Make/Zapier)에서 호출 → 즉시 갱신 | P0 | Bearer 토큰 보호 |
| 인쇄 전용 CSS | `@media print` 로 헤더·푸터·배경 최적화 | P1 | 보조 안전망 |
| 비밀번호 보호 견적 | URL + 비밀번호 이중 인증 | Future | |
| 만료일 후 자동 차단 | `ValidUntil` 이후 410 반환 | Future | |
| 클라이언트 열람 알림 | 운영자에게 "열람됨" 알림 | Future | |
| 견적 버전 히스토리 | 수정 이력 보관·비교 | Future | |
| 전자 서명·동의 | 클라이언트가 웹에서 승인 클릭 | Future | |
| 로고·브랜드 컬러 커스터마이즈 | 운영자별 디자인 옵션 | Future | |
| 다국어 / 다중 통화 | i18n + KRW/USD 등 | Future | |
| 운영자 대시보드 | 발행/열람/PDF 다운로드 통계 | Future | |

### IA

```
/                        랜딩 (운영자용 소개. MVP에서는 정적 1페이지로 충분)
├─ /q/[slug]             견적서 열람 페이지 (클라이언트가 받는 URL)
├─ /q/[slug]/pdf         PDF 생성 엔드포인트 (서버 라우트, 파일 응답)
└─ /api/revalidate       Notion 변경 시 외부 자동화에서 호출 (Bearer 인증)
```

> MVP에서는 운영자 전용 화면(로그인·대시보드)을 만들지 않는다. 운영자는 Notion에서만 작업한다.
>
> 〔v1.x 변경〕 위 가정은 **부록 A. v1.x 고도화** 에서 뒤집힌다 — 인증으로 보호되는 운영자용 `/admin` 견적 목록 화면을 도입한다. (단, "대시보드(통계)" 가 아니라 "목록 + 링크 복사" 다. 통계 대시보드는 여전히 Future.)

### Wire-frame (텍스트 와이어)

**견적서 열람 페이지 `/q/[slug]`** (A4 비율 기준, 모바일은 단일 컬럼으로 축약)

```
┌──────────────────────────────────────────────────┐
│ [발행자 회사명 / 로고(텍스트 가능)]              │
│ 발행일: 2026-05-17    견적번호: Q-2026-0042      │
│ 유효기간: 2026-06-16                              │
├──────────────────────────────────────────────────┤
│ 받는 분:                                          │
│   ABC 주식회사                                    │
│   담당: 김혜진 대표                               │
├──────────────────────────────────────────────────┤
│ 견적 항목                                         │
│ ┌──────────────┬──────┬────────┬──────────────┐ │
│ │ 항목         │ 수량 │ 단가   │ 금액         │ │
│ ├──────────────┼──────┼────────┼──────────────┤ │
│ │ 로고 디자인  │  1   │ 1,500K │   1,500,000  │ │
│ │ 명함 디자인  │  2   │   200K │     400,000  │ │
│ └──────────────┴──────┴────────┴──────────────┘ │
│                          소계 :    1,900,000     │
│                          부가세:     190,000     │
│                       총 합계 :    2,090,000원   │
├──────────────────────────────────────────────────┤
│ 비고 / 결제 조건 (자유 텍스트)                    │
├──────────────────────────────────────────────────┤
│ [ PDF 다운로드 ]                                 │
└──────────────────────────────────────────────────┘
```

- 모바일에서는 항목 표가 카드 형태로 분해(`항목명 / 수량 × 단가 = 금액`)되어 가로 스크롤 없이 보인다.
- "PDF 다운로드" 버튼은 본문 하단과 화면 우상단 두 위치에 동일 동작으로 노출.

### 기획안

**1. Notion 데이터 모델**
- Notion에 `Quotes` Database 1개 생성.
- 견적 1건 = 행 1개. 견적 항목 표는 **page body 안의 Notion table 블록**으로 작성한다(별도 child DB 만들지 않음).
  - 이유: MVP 단순화. child DB까지 페치하면 API 호출이 늘고 권한 연결 작업도 복잡해진다.
- `Status=Published` 인 행만 웹에 노출. `Draft` / `Archived` 는 404.

**2. 콘텐츠 페치 레이어**
- `lib/quotes.ts` 신규 (기존 `lib/notion.ts` 패턴 재사용).
- 함수: `getQuoteBySlug(slug)` 1개로 시작. 목록 조회는 운영자가 Notion에서 직접 보면 되므로 만들지 않는다. 〔v1.x 변경〕 부록 A 에서 관리자 견적 목록을 위해 목록 페치 함수 `queryPublishedQuotes()` 를 신규 추가한다.
- `server-only` 가드 + `requireEnv` 헬퍼 동일하게 적용.
- 캐시: 견적 페이지에서 `"use cache"` + `cacheLife("minutes")`. 수정 즉시 반영이 필요한 경우 on-demand revalidate webhook 사용.

**3. 항목 표 파싱**
- Notion page body 안의 첫 번째 `table` 블록을 항목 표로 간주.
- 컬럼 순서 약속: `항목명 / 수량 / 단가 / (선택)비고`. 금액은 코드에서 `수량 × 단가`로 계산.
- 운영자 약속을 어긴 표(컬럼 수 다름 등)는 페이지 상단에 경고 배너 + 콘솔 warning 후 빈 표로 처리.

**4. PDF 생성**
- 방식: **헤드리스 Chromium (`@sparticuz/chromium` + `puppeteer-core`)을 Vercel Function에서 실행**해 `/q/[slug]?print=1` URL을 PDF로 인쇄.
- 이유: `@react-pdf/renderer`는 표·한글 폰트 처리에 추가 작업이 많고, `window.print()`는 클라이언트 브라우저별 결과가 달라 결재용 일관성 보장이 어렵다. 헤드리스 인쇄는 화면 컴포넌트를 그대로 재사용해 **"화면 = PDF"** 가 자동 보장된다.
- 한글 폰트: Pretendard 또는 Noto Sans KR을 next/font로 임베드.
- 파일명: `견적서_<고객사명>_<YYYYMMDD>.pdf` (slug fallback).
- 대안 (운영자가 비용·콜드스타트를 우려할 경우): `window.print()` + 인쇄 전용 CSS로 다운그레이드. 이 경우 P0 기능은 유지되나 결과 일관성은 떨어진다 → [열린 질문] 참고.

**5. URL 보안 모델 (MVP)**
- `Slug` 는 `nanoid(32)` 또는 32자 hex 무작위. 운영자는 이를 Notion에 수동 붙여넣거나 Notion `Formula` 로 생성.
- URL 자체가 비밀이다. 외부에 새지 않는 한 추측 불가.
- 검색엔진 인덱싱 차단: `/q/[slug]` 응답에 `X-Robots-Tag: noindex, nofollow` + `robots.txt` 에서 `/q/` Disallow.
- 추가 보안(비밀번호·만료 차단·열람 IP 화이트리스트)은 Future.

**6. 갱신 방식**
- 기본: 페이지 캐시 `cacheLife("minutes")`. 1~5분 내 자동 반영.
- 즉시 반영이 필요한 경우: Notion 외부 자동화(Make/Zapier)에서 행 변경 트리거 → `/api/revalidate` POST (Bearer 토큰) → `revalidateTag(`quote:${slug}`)` 호출.

### DataTable

`Quotes` Notion Database 스키마. (Notion 속성 ↔ TS 필드 1:1 매핑)

| 데이터타입 | 한글명 | 영문명 | 컬럼설명 |
|---|---|---|---|
| string | 견적 제목 | title | Notion `title` 속성. 내부 식별용. 예: `ABC社 로고 견적` |
| string (unique, ≥32자) | 슬러그 | slug | URL 경로. 무작위 nanoid. **중복 시 빌드/페치 실패** |
| enum | 상태 | status | `Draft` / `Published` / `Archived`. `Published`만 노출 |
| string | 고객사명 | clientCompany | 표시용. 예: `ABC 주식회사` |
| string | 고객 담당자 | clientContact | 표시용. 예: `김혜진 대표` |
| string | 발행자 회사명 | issuerCompany | 운영자 본인 회사명. 페이지 상단 표시 |
| string | 견적번호 | quoteNumber | 운영자가 수동 부여. 예: `Q-2026-0042` |
| Date | 발행일 | issuedAt | ISO 8601 |
| Date | 유효기간 | validUntil | ISO 8601. 지나면 만료 배너 표시 |
| number | 부가세율(%) | taxRate | 기본 10. 0 입력 시 부가세 행 숨김 |
| string (multi-line) | 비고/결제 조건 | notes | 자유 텍스트 |
| table block | 견적 항목 표 | items | page body 첫 `table` 블록. `[항목명, 수량, 단가, (비고)]` |
| derived (number) | 소계 | subtotal | 코드 계산: 행별 `수량 × 단가` 합 |
| derived (number) | 부가세 | tax | 코드 계산: `subtotal × taxRate / 100` |
| derived (number) | 총합계 | total | 코드 계산: `subtotal + tax` |

> `subtotal` / `tax` / `total` 은 Notion 속성으로 저장하지 않고 페치 시 코드에서 계산한다. 운영자가 단가를 수정하면 자동 반영된다.

---

## 기술 스택

- **프론트엔드 프레임워크**: Next.js 16.2.6 (App Router, RSC + Cache Components), React 19.2.4, TypeScript 5
- **스타일링 & UI**: Tailwind CSS v4 (`app/globals.css` 토큰), shadcn/ui (base-nova, `@base-ui/react`), lucide-react
- **백엔드 & 데이터베이스**: Notion API (`@notionhq/client` v5 — `databases.retrieve` → `dataSources.query` 2단계 패턴 필수), 별도 DB 없음
- **PDF 생성**: `@sparticuz/chromium` + `puppeteer-core` (Vercel Function 환경)
- **폰트**: Pretendard (또는 Noto Sans KR) — `next/font/local`
- **배포 & 호스팅**: Vercel (PDF 생성용 Function 메모리 1024MB 이상 권장)
- **패키지 관리**: npm

---

## 일정

### Future work
- 비밀번호 보호 견적 (URL + 비밀번호 이중)
- 만료일 후 자동 차단 (410 응답)
- 클라이언트 열람 알림 (Slack/이메일)
- 견적 버전 히스토리·비교
- 웹 전자 서명·승인 클릭
- 운영자 로고·브랜드 컬러 커스터마이즈
- 다국어 / 다중 통화
- 운영자 대시보드 (열람·다운로드 통계)
- 견적 항목 표를 child DB로 분리 (대규모·반복 항목 재사용)
- 멀티 테넌트 (여러 발행자가 1개 서비스에서 견적 관리)

> 모두 "지금 빠져도 Goal 검증에 지장 없음"이 명시 기준이다. 운영자 1명이 자기 클라이언트에게 보내는 단순 흐름이 작동하는지가 MVP의 검증 대상이다.

### Task and timeline (파트타임 2주 기준)

| 주차 | 작업 | 산출물 |
|---|---|---|
| W1 | Notion `Quotes` DB 스키마 정의, `lib/quotes.ts` 페치 함수, 슬러그 검증 | `.env.local`, `lib/quotes.ts`, `scripts/test/quotes-client.ts` |
| W1 | `/q/[slug]` 견적서 렌더 페이지(데스크톱 + 모바일 반응형), 항목 표 파싱·합계 계산 | `app/q/[slug]/page.tsx`, `components/quote-view.tsx` |
| W2 | PDF 생성 라우트 (`/q/[slug]/pdf`) — Chromium 기반, 한글 폰트 임베드 | `app/q/[slug]/pdf/route.ts` |
| W2 | on-demand revalidate webhook, `robots.txt` / `noindex` 헤더 | `app/api/revalidate/route.ts`, `public/robots.txt` |
| W2 | Playwright MCP로 시나리오 E2E (열람·PDF·만료 배너·404), 시드 견적 2건 작성 | 검증 리포트, 데모 링크 |

---

## 참고 사항

### MVP 원칙 (포함/제외 판단)
- **포함**: 견적 열람 페이지 / PDF 다운로드 / 추측 불가 URL / 상태 게이트 / 모바일 반응형 / 만료 배너 / on-demand revalidate
  - 이유: 위 7개 중 어느 하나가 빠지면 **"클라이언트가 받아 보고 PDF로 결재 올린다"** 라는 Goal 검증이 불가능하다.
- **제외(Future)**: 비밀번호·자동 차단·열람 알림·전자서명·대시보드·다국어
  - 이유: URL 자체가 비밀 키 역할을 하면 1차 보안은 성립한다. 알림·서명·통계는 "있으면 좋지만 없어도 견적 거래는 성사된다."

### 반드시 해야할 기술 스택 / 제약
- Notion 공식 클라이언트(`@notionhq/client` v5) — `databases.query` 사용 금지, `databases.retrieve` → `dataSources.query` 2단계 패턴 필수 (저장소 `CLAUDE.md` 함정 노트 참고).
- `server-only` 가드 — `lib/quotes.ts` 첫 줄 `import "server-only"` 필수. Notion 토큰의 클라이언트 노출 위험을 컴파일 단계에서 차단.
- `NOTION_TOKEN` / `NOTION_DATABASE_ID` 환경변수는 `NEXT_PUBLIC_` 접두 금지.
- Next.js 16 동적 라우트 — `params` 는 `Promise` → `await`. 데이터 페치 부분은 `<Suspense>` 안에 둬야 빌드 통과 (Cache Components 규칙).
- Notion 커버/이미지 호스트는 `next.config.ts` `images.remotePatterns` 에 이미 등록된 3종(`prod-files-secure.s3.us-west-2.amazonaws.com` 등) 그대로 사용.

### 처리 프로세스 (정합성 보장)

1. **수집**: `getQuoteBySlug(slug)` — `Status=Published AND Slug=slug` 필터로 1건 조회. 0건이면 `notFound()` → 404.
2. **항목 표 파싱**: page body의 첫 `table` 블록을 조회. 컬럼 약속(`항목명 / 수량 / 단가 / 비고`) 위반 시 빈 배열 + console.warn.
3. **계산**: `subtotal = Σ(수량 × 단가)` → `tax = subtotal × taxRate/100` → `total = subtotal + tax`. 모두 정수 원 단위로 반올림.
4. **만료 판정**: `validUntil < now()` 면 `isExpired = true` → 본문 상단 만료 배너 노출(열람은 허용, MVP 기준).
5. **캐시**: 페이지 단위 `"use cache"` + `cacheLife("minutes")`. 태그 `quote:${slug}` 로 on-demand revalidate.
6. **PDF**: `/q/[slug]/pdf` → 같은 페이지를 `?print=1` 로 헤드리스 Chromium에서 인쇄 → `application/pdf` 응답. 파일명 `Content-Disposition: attachment; filename="견적서_<clientCompany>_<YYYYMMDD>.pdf"`.

**정합성 규칙 (코드에 반드시 반영)**
- **Slug 중복** → `getQuoteBySlug` 가 2건 이상 받으면 `throw new Error("Duplicate slug: <slug>")`. 페이지 렌더 즉시 실패해야 한다(데이터 손상 신호).
- **필수 속성 누락** (`title` / `slug` / `status` / `issuerCompany` / `clientCompany` 중 하나라도) → `console.warn` + 페이지에 "필수 정보 누락" 배너. 견적서 전체를 빈 화면으로 노출하지 않는다.
- **slug 형식 검증** — 32자 미만 또는 영숫자 외 문자 포함 시 운영자 실수로 간주 → 페치 단계에서 거부(404).
- **컬럼 약속 위반** — 항목 표가 약속과 다르면 빈 표 + 경고 배너. 합계 0으로 표시(0원 견적이 발행되지 않도록 운영자가 즉시 알아챌 수 있게).
- **검색엔진 차단** — `/q/[slug]` 응답 헤더에 `X-Robots-Tag: noindex, nofollow` 강제. `robots.txt` Disallow.

### 정합성 검증 체크리스트
- [x] Goal(견적 발행·열람·PDF 결재)과 핵심 기능(열람·PDF·URL·상태·만료·revalidate)이 1:1로 연결되어 있는가
- [x] DataTable의 모든 항목이 기능 명세서/기획안에서 사용되는가 (derived 3종 포함)
- [x] 기능 명세서의 P0 항목이 모두 DataTable·기획안·정합성 규칙에 반영되어 있는가
- [x] MVP 범위를 벗어난 기능(비밀번호·자동 차단·알림·서명·대시보드)이 모두 Future로 분리되어 있는가
- [x] 보안 최소선(추측 불가 URL + noindex + 서버 전용 토큰)이 P0로 명시되어 있는가
- [x] 한글 견적서·결재용이라는 도메인 특수성(폰트·통화·세금·A4)이 기술 결정에 반영되어 있는가

---

## 자가 검증 (작성자 자체 점검)

**풀스펙 검열 — P0 항목 재검토**
- Notion 페치, 견적서 렌더, PDF 다운로드, 추측 불가 URL, 상태 게이트, 만료 배너, 모바일 반응형, on-demand revalidate → 8개 모두 "빠지면 Goal 검증 불가" 통과.
- "인쇄 전용 CSS"는 PDF 생성이 헤드리스 Chromium으로 이미 보장되므로 P1로 강등 (보조 안전망).
- "항목·합계 자동 계산"은 견적서 본질이라 P0 유지. (수동 입력 시 운영자 실수가 곧 클라이언트 신뢰 손상)

**DataTable ↔ 기능 명세서 교차 확인**
- 기능 명세서의 모든 P0 기능이 DataTable에 대응 필드 보유: `Slug`(URL), `Status`(게이트), `ValidUntil`(만료 배너), `items`(항목 표), `subtotal/tax/total`(합계).
- DataTable의 모든 항목이 기획안·정합성 규칙·기획안에서 1회 이상 사용됨. 미사용 항목 없음.

---

## 작성 가정 / 운영자 결정 필요 사항

1. **PDF 생성 방식**: 본 PRD는 헤드리스 Chromium(`@sparticuz/chromium`)을 가정했다. Vercel Function 콜드스타트 1~3초 + 메모리 1024MB 비용 부담을 줄이려면 `window.print()` + 인쇄 전용 CSS 로 다운그레이드 가능 — 어느 쪽을 선택할지 결정 필요.
2. **slug 생성 주체**: 운영자가 Notion `Formula` 로 자동 생성할지, 매번 수동으로 nanoid를 붙여넣을지 결정 필요. (자동화하려면 Notion `id()` + 해시 조합 또는 Make/Zapier 보조 필요)
3. **견적 항목 표 위치**: 본 PRD는 "Notion page body의 첫 `table` 블록" 을 가정했다. 대신 child DB로 분리할지 결정 필요 — child DB 채택 시 운영자가 항목 재사용은 편해지지만 권한 연결·페치 호출이 추가된다.
4. **부가세 기본값**: 10%를 디폴트로 가정했다. 면세사업자·해외 거래 등 0% 케이스 빈도에 따라 디폴트 변경 가능.
5. **만료 견적 정책**: MVP는 "만료돼도 열람은 허용 + 배너만 표시" 다. 사내 결재가 끝난 뒤에도 클라이언트가 옛 견적을 재이용하는 사고를 막으려면 410 차단을 P0로 올릴지 결정 필요.

---
---

# 부록 A. v1.x 고도화 (2026-05-22)

> 이 부록은 **MVP(W0~W2) 가 빌드·Vercel 배포·PDF 동작까지 완료된 이후** 추가하는 고도화 기능을 담는다. 위 본문(MVP)은 그대로 보존되며, 여기서부터가 다음 개발 단계(가칭 W3~)의 범위다.
>
> **고도화 3종**
> 1. 관리자 레이아웃 — 견적 목록 (NEW, 큰 변경 · 인증 게이트 필수)
> 2. 견적 목록에서 공유 링크 복사 (위 1의 하위 인터랙션)
> 3. 다크모드 — ⚠️ **이미 구현됨**. 신규 개발 아님. 검증·문서화 + 선택적 폴리시만.
>
> ⚠️ 본 부록은 MVP 의 Future 목록(비밀번호 보호·자동 410·열람 알림·버전 히스토리·전자서명·브랜드 커스터마이즈·다국어·**대시보드(통계)**·멀티테넌트)을 **건드리지 않는다**. 그 항목들은 여전히 Future 다. 특히 v1.x 의 "관리자 견적 목록" 은 **목록 + 링크 복사** 이지 "통계 대시보드" 가 아니다 — 둘은 별개 기능이다.

## A.1 Overview (고도화)

### What
운영자(박상준)가 **발행된 견적 전체를 한 화면에서 목록으로** 보고, 각 견적의 **공유 링크를 버튼 한 번으로 복사**할 수 있는 **인증으로 보호되는 관리자 화면(`/admin`)** 을 추가한다.
다크모드는 이미 구현돼 있으므로(아래 A.6) 신규 개발 대상이 아니라 **검증·문서화 + 관리자 화면 일관 적용** 만 다룬다.

### Who
- **운영자(박상준)** — 본문 페르소나 P1 그대로. 월 5~10건의 견적을 발행하며, 지금까지는 공유 링크를 Notion 에서 직접 찾아 복사했다. 발행 건수가 쌓이면서 "어떤 견적을 누구에게 보냈는지, 링크가 무엇인지" 를 Notion 행을 일일이 열어 확인하는 비용이 커졌다.
- (클라이언트 페르소나 P2 는 이 고도화의 대상이 아니다. `/admin` 은 운영자 전용이며 클라이언트는 접근하지 않는다.)

### Why
- 운영자: MVP 기준 "목록은 Notion 에서 보면 된다" 였지만, Notion 의 견적 행에는 **클라이언트에게 보낼 실제 공유 URL(`/q/<slug>`) 이 그대로 보이지 않는다**(slug 는 Formula 값이고, 도메인을 붙인 완성 URL 은 운영자가 머릿속에서 조립해야 함). 발행 견적이 늘면 "이 고객 견적의 링크가 뭐였지?" 를 매번 찾는 마찰이 생긴다. → **한 화면에서 목록 + 완성된 공유 링크 1클릭 복사** 가 필요.

### Goal (고도화)
**운영자는 `/admin` 에 로그인한 뒤, 발행된 견적 목록에서 원하는 견적의 공유 링크를 3초 안에 클립보드로 복사해 카톡·메일에 붙여넣을 수 있다. 동시에 이 화면은 인증 없이는 누구도 열 수 없어 전체 견적 URL 목록이 외부에 유출되지 않는다.**

### How (고도화)
1. `/admin/login` 에서 운영자가 환경변수에 저장된 비밀번호를 입력 → 서버가 검증 후 서명된 세션 쿠키 발급.
2. `proxy.ts` 가 `/admin/*` 요청마다 세션 쿠키를 검사 → 없거나 위조면 `/admin/login` 으로 리다이렉트.
3. 인증된 운영자에게 `/admin` 이 발행 견적 목록(제목·고객사·견적번호·발행일·상태)을 테이블로 렌더.
4. 각 행의 **[링크 복사]** 버튼 → `${origin}/q/${slug}` 를 클립보드에 복사 + 토스트("링크를 복사했습니다").
5. `/admin/*` 는 `noindex` (proxy 헤더 + robots.txt) 로 검색엔진에서 완전히 가린다.

## A.2 보안 — 이 기능의 P0 (가장 중요)

> **왜 인증이 필수인가** — MVP 의 보안 모델은 **"URL 자체가 비밀"** 이다(추측 불가 32자 slug). 관리자 목록 화면은 **모든 견적의 공유 링크를 한 곳에 모아 노출**한다. 따라서 이 페이지가 인증 없이 공개되면 **단 한 번의 접근으로 전체 견적 URL 이 통째로 유출** 되어 MVP 보안 모델 전체가 붕괴한다. → **`/admin/*` 은 반드시 인증(로그인) 게이트 뒤에 둔다. 인증은 이 고도화 기능의 P0 이며, 목록 UI 보다 먼저 성립해야 한다.**

### 인증 방식 — 권장안 + 대안 (운영자 결정 필요)

단일 운영자 MVP 성격(다중 사용자·역할 없음)에 맞춰 **신규 npm install 없이** Next.js 16 내장 기능만으로 구현 가능한 경량안을 권장한다.

| 안 | 방식 | 장점 | 단점 | 신규 의존성 |
|---|---|---|---|---|
| **권장 — 환경변수 비밀번호 + 서명 세션 쿠키** | `/admin/login` POST 에서 입력 비번을 `ADMIN_PASSWORD`(env) 와 비교 → 일치 시 Web Crypto(HMAC-SHA256, `ADMIN_SESSION_SECRET`)로 서명한 토큰을 `httpOnly`+`secure`+`sameSite=lax` 쿠키로 발급. `proxy.ts` 가 `/admin/*` 마다 서명 검증. | 단일 운영자에 충분. 외부 라이브러리 0. 로그인 폼 UX 가 깔끔(카톡 인앱 등에서도 동작). 쿠키 만료·로그아웃 제어 가능. | 로그인 페이지·서명 유틸·세션 검증 코드를 직접 작성해야 함. | **없음** (Web Crypto 내장) |
| 대안 1 — HTTP Basic Auth (proxy) | `proxy.ts` 에서 `/admin/*` 요청의 `Authorization: Basic` 헤더를 `ADMIN_USER`/`ADMIN_PASSWORD` 와 비교, 불일치 시 `401 + WWW-Authenticate`. | 코드량 최소(로그인 페이지 불필요). | 브라우저 기본 팝업 UI(투박·로그아웃 어려움). 비번이 매 요청 평문 전송(HTTPS 전제 필수). 모바일 인앱 브라우저 호환성 편차. | 없음 |
| 대안 2 — Vercel 플랫폼 보호 | Vercel 프로젝트의 Password Protection / Deployment Protection 으로 `/admin` 경로 보호(또는 별도 프리뷰). | 코드 0. | Vercel 유료 플랜 필요할 수 있음. 경로 단위 세밀 제어가 코드보다 약함. Vercel 종속. | 없음(플랫폼 설정) |

> **권장 = 환경변수 비밀번호 + 서명 세션 쿠키.** 로그인 UX·로그아웃·쿠키 만료 제어가 필요하고, shadcn `field`/`input`/`button` 으로 로그인 폼을 이미 만들 수 있으며, Web Crypto 가 Node/Edge 양쪽에서 동작하므로 신규 의존성이 없다.
>
> ⚠️ **운영자 결정 필요** — 위 3안 중 택1. (아래 A.9 "운영자 결정 필요 사항" 1번에 등록.)

### 인증과 무관하게 항상 적용할 보안 규칙
- `/admin/*` 응답에 `X-Robots-Tag: noindex, nofollow, noarchive` (proxy.ts matcher 확장) + `robots.txt` 에 `/admin` Disallow.
- 비밀번호·세션 시크릿은 `NEXT_PUBLIC_` 금지(서버 전용 env). 비교는 타이밍 안전 비교 권장.
- 로그인 실패 시 어떤 견적 정보도 응답에 포함하지 않는다(목록 페치는 인증 통과 후에만 실행).

## A.3 기능 명세서 (고도화 — 본문 명세서에 추가)

| 기능명 | 설명 | 우선순위 | 비고 |
|---|---|---|---|
| **관리자 인증 게이트** | `/admin/*` 를 로그인(서명 세션 쿠키) 뒤로 보호. 미인증 → `/admin/login` 리다이렉트 | **P0** (이 기능군의 최우선) | 신규 npm install 없음(Web Crypto). 방식 운영자 결정 필요 |
| 관리자 로그인 페이지 | `/admin/login` — 비밀번호 입력 폼 → 서버 검증 → 세션 쿠키 발급 | P0 | shadcn `field`/`input`/`button` 재사용 |
| 발행 견적 목록 | `/admin` — `상태=발행` 견적을 테이블로(제목·고객사·견적번호·발행일·상태) | P0 | 신규 페치 `queryPublishedQuotes()` |
| 목록 페치 함수 | `lib/quotes.ts` 에 `queryPublishedQuotes()` 추가 — 목록용 필드만 정규화 | P0 | MVP 가정 "목록 함수 안 만든다" 변경 |
| 공유 링크 복사 버튼 | 행별 [링크 복사] → `${origin}/q/${slug}` 클립보드 복사 + 토스트 | P0 | 클라이언트 컴포넌트. `navigator.clipboard` + sonner |
| `/admin` noindex | proxy 헤더 + robots.txt 로 검색엔진 차단 | P0 | 보안 규칙 |
| 행에서 견적 열람 이동 | 행의 [열람] → `/q/[slug]` 새 탭 열기 | P1 | 운영자가 발행 결과 미리보기 |
| 로그아웃 | 세션 쿠키 삭제 → `/admin/login` 이동 | P1 | 쿠키 방식 채택 시 |
| 다크모드 | next-themes 기반 라이트/다크/시스템 전환 | **구현됨** | 신규 개발 아님. A.6 참조(검증·문서화만) |
| 목록 검색·정렬·필터 | 고객사/날짜 검색, 컬럼 정렬 | Future | 발행 건수 적은 동안 불필요 |
| 목록 페이지네이션 | 견적 수 많아질 때 페이지 분할 | Future | MVP 규모(월 5~10건)에선 불필요 |
| 다중 운영자·역할 | 사용자별 계정·권한 | Future | 단일 운영자 가정 유지 |

## A.4 IA (고도화 — 본문 IA 에 추가)

```
/                        랜딩 (MVP 그대로)
├─ /q/[slug]             견적서 열람 (MVP 그대로 · 클라이언트 공개)
├─ /q/[slug]/pdf         PDF 생성 (MVP 그대로)
├─ /api/revalidate       revalidate webhook (MVP 그대로)
│
├─ /admin/login          🆕 운영자 로그인 (공개. 비번 입력 폼)            ← 인증 게이트 진입점
└─ /admin                🆕 발행 견적 목록 (🔒 인증 필수 · noindex)       ← 세션 쿠키 없으면 /admin/login 리다이렉트
```

> 〔본문 IA 주석 변경〕 본문 IA 의 "MVP에서는 운영자 전용 화면을 만들지 않는다" 는 v1.x 에서 **변경됨**. 위 `/admin/*` 두 라우트가 운영자 전용 화면이다. 단 이는 **목록 + 링크 복사** 화면이며, "통계 대시보드"(여전히 Future)와는 구분된다.
>
> **인증 게이트 위치**: `proxy.ts` 가 `/admin`(단, `/admin/login` 제외)에 대해 세션 쿠키를 검사한다. 현재 `proxy.ts` 의 matcher 는 `/q/:path*` 뿐이므로 **`/admin/:path*` 를 matcher 에 추가**해야 한다(noindex 헤더 + 인증 리다이렉트 둘 다 여기서 처리).

## A.5 Wire-frame (고도화)

**관리자 로그인 `/admin/login`**

```
┌────────────────────────────────────┐
│            견적 관리자               │
│  ┌──────────────────────────────┐  │
│  │ 비밀번호: [ ************* ]    │  │
│  │           [ 로그인 ]          │  │
│  └──────────────────────────────┘  │
│  (실패 시: "비밀번호가 올바르지     │
│   않습니다." 인라인 에러)            │
└────────────────────────────────────┘
```

**관리자 견적 목록 `/admin`** (인증 통과 후)

```
┌──────────────────────────────────────────────────────────────────────┐
│  발행 견적 목록 (총 7건)                          [테마전환] [로그아웃] │
├──────────────┬────────────┬────────────┬──────────┬──────┬───────────┤
│ 제목          │ 고객사      │ 견적번호    │ 발행일    │ 상태  │ 동작       │
├──────────────┼────────────┼────────────┼──────────┼──────┼───────────┤
│ ABC 로고 견적 │ ABC 주식회사│ Q-2026-0042│ 26-05-17 │ 발행  │ [열람][복사]│
│ XYZ 앱 견적   │ XYZ Inc.   │ Q-2026-0041│ 26-05-15 │ 발행  │ [열람][복사]│
│ …            │ …          │ …          │ …        │ …    │ …         │
└──────────────┴────────────┴────────────┴──────────┴──────┴───────────┘
   [복사] 클릭 → 토스트: "링크를 복사했습니다"  (클립보드: https://…/q/<slug>)
```

- 모바일에서는 행이 카드 형태로 분해(`제목 / 고객사 / 발행일 / [열람] [복사]`).
- `[열람]` = `/q/[slug]` 새 탭, `[복사]` = 공유 URL 클립보드 복사.
- 헤더의 [테마전환] 은 기존 `ThemeToggle`(이미 구현) 을 그대로 노출 → 관리자 화면에도 다크모드 일관 적용(A.6).

## A.6 다크모드 — ⚠️ 이미 구현됨 (검증·문서화만)

> **신규 개발 항목 아님.** 실측(2026-05-22, 코드 직접 확인):
> - `components/common/ThemeProvider.tsx` — `next-themes` `ThemeProvider` 래퍼.
> - `components/common/ThemeToggle.tsx` — 헤더 "테마 전환" 버튼(`aria-label="테마 전환"`, Sun/Moon 아이콘 토글, `resolvedTheme` 기반).
> - `app/layout.tsx` — `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`, `<html lang="ko" suppressHydrationWarning>`.
> - `app/globals.css` — `.dark` 토큰(oklch) + `@custom-variant dark`.
> - T2.6(MVP W2)에서 다크모드 시각 검증 완료.

**고도화 범위는 다음 두 가지로 한정(과설계 금지):**
1. **검증·문서화** — `defaultTheme="system"` 기본값 동작 확인(OS 설정 추종), 사용자 선호 persist 확인(next-themes 는 localStorage 키 `theme` 에 자동 저장 → 새 방문 시 복원). Playwright 로 라이트/다크/시스템 3상태 회귀 스냅샷.
2. **선택적 폴리시 — 관리자 화면 일관 적용** — `/admin`·`/admin/login` 도 동일 토큰·`ThemeToggle` 을 사용해 라이트/다크가 깨지지 않게 한다. (신규 토큰·신규 토글 만들지 않음. 기존 자산 재사용.)

## A.7 기획안 / 처리 프로세스 (고도화)

**1. 목록 페치 — `queryPublishedQuotes()` (신규, `lib/quotes.ts`)**
- MVP 의 `getQuoteBySlug` 와 동일한 v5 2단계 패턴(`resolveDataSourceId` 재사용) + `상태=발행` select 필터로 발행 견적 전체를 `start_cursor` 페이지네이션 조회.
- ⚠️ **슬러그 formula 서버 필터 불가** 함정(본문·CLAUDE.md 기록)은 목록에도 적용 — 하지만 목록은 slug 로 **필터링하지 않고** 발행 견적 전체를 가져와 각 행의 slug 를 `getFormulaString` 으로 읽기만 하므로 문제 없음.
- 반환 타입: 목록용 경량 타입(예: `QuoteListItem` = `{ slug, title, clientCompany, quoteNumber, issuedAt, status }`). **합계·항목(Items)·notes 는 페치하지 않는다**(목록에 불필요 + N+1 호출 방지).
- 정렬: `발행일`(date) 내림차순(최신 우선). Notion `sorts` 또는 코드 정렬.
- 정합성: 본문 규칙 1~3 동일 적용(필수 속성 누락 행은 `console.warn` 후 목록에는 표시하되 누락 필드는 "-"). slug 가 형식 위반인 행은 [복사] 비활성(잘못된 URL 복사 방지).

**2. 인증 모델 (권장안 기준 — 환경변수 비번 + 서명 세션 쿠키)**
- `lib/admin-auth.ts`(신규, `server-only`): `signSession()`/`verifySession()` — Web Crypto `crypto.subtle` HMAC-SHA256 으로 `{ iat, exp }` 페이로드를 서명. `ADMIN_SESSION_SECRET`(env) 사용.
- `/admin/login` (Route Handler 또는 Server Action): 입력 비번 ⟷ `ADMIN_PASSWORD`(env) 타이밍 안전 비교 → 일치 시 `cookies().set("admin_session", token, { httpOnly:true, secure:true, sameSite:"lax", path:"/admin", maxAge:… })`.
- `proxy.ts`: `/admin`(login 제외)에서 `cookies()` 로 세션 읽어 `verifySession()` → 실패 시 `NextResponse.redirect("/admin/login")`. 동시에 `/admin/*` 에 noindex 헤더.
- ⚠️ **proxy 에서 검증은 "낙관적(optimistic) 게이트"** — Next.js 권장 패턴대로 proxy 는 1차 차단만 담당하고, 실제 데이터 페치(`/admin` 페이지의 `queryPublishedQuotes()`) 진입 전 **서버 컴포넌트에서도 세션을 재검증**한다(2중 안전망. proxy 우회·쿠키 조작 대비).

**3. 링크 복사 흐름 (클라이언트 컴포넌트)**
- `components/admin/copy-link-button.tsx`(신규, `"use client"`): props 로 `slug` 받음 → 클릭 시 `navigator.clipboard.writeText(`${window.location.origin}/q/${slug}`)` → 성공 `toast.success("링크를 복사했습니다")`, 실패 `toast.error(...)`(권한 거부·비보안 컨텍스트 대비). sonner `<Toaster>` 는 루트 레이아웃에 이미 있으므로 재선언 금지.
- ⚠️ `navigator.clipboard` 는 보안 컨텍스트(HTTPS/localhost)에서만 동작 → 실패 시 fallback(텍스트 선택·수동 복사 안내) 토스트.
- origin 은 클라이언트에서 `window.location.origin` 으로 조립(서버에서 `NEXT_PUBLIC_APP_URL` 주입도 가능 — 운영자 결정 A.9 3번).

## A.8 DataTable (고도화)

> ⚠️ **신규 Notion 속성·신규 필드 불필요.** 관리자 목록이 쓰는 모든 컬럼은 본문 `Quote` 타입에 **이미 존재**한다(실측: `types/index.ts`).

| 데이터타입 | 한글명 | 영문명 | 출처 | 컬럼설명 |
|---|---|---|---|---|
| string | 견적 제목 | title | `Quote.title` (기존) | 목록 행 제목 |
| string | 고객사명 | clientCompany | `Quote.clientCompany` (기존) | 목록 행 고객사 |
| string | 견적번호 | quoteNumber | `Quote.quoteNumber` (기존) | 목록 행 견적번호 |
| Date | 발행일 | issuedAt | `Quote.issuedAt` (기존) | 목록 정렬 키(내림차순) |
| enum | 상태 | status | `Quote.status` (기존) | `발행`만 목록 노출 |
| string (≥32자) | 슬러그 | slug | `Quote.slug` (기존) | `[복사]` → `${origin}/q/${slug}`, `[열람]` 링크 |

**신규(코드/인프라 — Notion DB 아님)**

| 데이터타입 | 한글명 | 영문명 | 컬럼설명 |
|---|---|---|---|
| TS interface | 목록 항목(경량) | QuoteListItem | `queryPublishedQuotes()` 반환 행. 위 6필드만(항목·합계·notes 제외) |
| string (env) | 관리자 비밀번호 | ADMIN_PASSWORD | 서버 전용. 로그인 검증값. `NEXT_PUBLIC_` 금지 |
| string (env) | 세션 서명 시크릿 | ADMIN_SESSION_SECRET | 서버 전용. HMAC 서명 키(32자+ 무작위) |
| cookie | 관리자 세션 | admin_session | `httpOnly`+`secure`+`sameSite=lax` 서명 토큰. `verifySession()` 검증 |

## A.9 작성 가정 / 운영자 결정 필요 사항 (고도화)

1. **관리자 인증 방식 (최우선 결정)** — A.2 의 3안 중 택1. **권장: 환경변수 비번 + 서명 세션 쿠키**(신규 의존성 0, 로그인 UX·로그아웃 제어 가능). 대안: HTTP Basic Auth(코드 최소·UX 투박), Vercel 플랫폼 보호(코드 0·플랫폼 종속). → 인증 코드 구조가 이 선택에 따라 갈리므로 **개발 착수 전 확정 필요**.
2. **세션 만료(maxAge)** — 권장안 채택 시 세션 쿠키 유효기간(예: 7일 / 30일 / "브라우저 닫으면 만료"). 단일 운영자 본인 기기 가정이면 길게 둬도 무방. 결정 필요.
3. **공유 URL origin 조립 방식** — `[복사]` 가 만드는 URL 의 도메인을 클라이언트 `window.location.origin` 으로 잡을지(배포 도메인에서 열면 자동), `NEXT_PUBLIC_APP_URL` 로 고정할지. production 도메인(`notion-ai-blog-zeta.vercel.app` 또는 커스텀 도메인)이 확정되면 후자가 안전. 결정 필요.
4. **목록 기본 노출 범위** — `상태=발행` 만 보일지, `초안`·`보관` 도 (상태 뱃지와 함께) 보일지. 본 PRD 는 "발행만" 가정(공유 가능한 견적 = 발행). 운영자가 초안 관리도 원하면 확장. 결정 필요.

## A.10 정합성 검증 체크리스트 (고도화)

- [x] 고도화 Goal(인증된 운영자가 목록에서 링크 3초 복사 + URL 비유출)과 P0 기능(인증 게이트·목록·링크 복사·noindex)이 1:1 연결되는가
- [x] 보안 최우선 원칙(목록은 인증 뒤에서만, URL 유출 방지)이 P0 로 명시되고 인증이 목록보다 선행하도록 기술됐는가
- [x] 신규 npm install 가정이 없는가 (인증=Web Crypto 내장, 복사=navigator.clipboard, UI=기존 shadcn/sonner/next-themes)
- [x] DataTable 의 목록 필드가 모두 기존 `Quote` 타입에 존재함을 실측 확인했는가 (신규 Notion 속성 0)
- [x] 다크모드를 "신규 개발" 이 아니라 "이미 구현됨 + 검증/문서화" 로 처리했는가
- [x] MVP 의 Future 목록(대시보드 통계 포함)을 건드리지 않고, v1.x 관리자 목록이 "통계 대시보드" 와 구분됨을 명시했는가
- [x] MVP 가정 변경 2건(운영자 화면 도입 / 목록 페치 함수 신규)이 본문에 각주로 표시되고 부록에 상세 기록됐는가

## A.11 자가 검증 (고도화 — 작성자 자체 점검)

**풀스펙 검열 — 고도화 P0 재검토**
- 관리자 인증 게이트 / 로그인 페이지 / 발행 목록 / 목록 페치 함수 / 링크 복사 / `/admin` noindex → 6개 모두 "빠지면 고도화 Goal(인증된 목록에서 안전하게 링크 복사) 검증 불가" 통과.
- "행에서 견적 열람 이동", "로그아웃" 은 없어도 핵심 Goal(복사) 검증이 가능 → **P1 로 강등**.
- "검색·정렬·필터", "페이지네이션", "다중 운영자" 는 발행 건수 적은 단일 운영자 규모에서 불필요 → **Future**.
- 다크모드는 이미 구현됨 → 신규 P0 아님(검증·문서화만).

**DataTable ↔ 기능 명세서 교차 확인 (고도화)**
- 목록 명세서의 표시 필드(제목·고객사·견적번호·발행일·상태·slug) → 전부 본문 `Quote`/`QuoteListItem` 에 존재(실측). 신규 Notion 속성 0건.
- 인증 명세서의 객체(ADMIN_PASSWORD·ADMIN_SESSION_SECRET·admin_session 쿠키) → A.8 신규 표에 모두 등재. 미사용 항목 없음.
- `queryPublishedQuotes()` 가 반환하는 `QuoteListItem` 의 모든 필드가 목록 UI(테이블 컬럼 + 복사/열람 동작)에서 1회 이상 사용됨.

## A.12 환경변수 추가 (고도화 — `.env.example` 에 반영 필요)

> 권장 인증안(환경변수 비번 + 서명 세션 쿠키) 채택 시 추가. (대안 채택 시 일부 불필요.)

```bash
# ===========================
# 관리자 화면 (/admin) 인증 — v1.x 고도화
# - ADMIN_PASSWORD: /admin/login 검증 비밀번호. NEXT_PUBLIC_ 금지(서버 전용).
# - ADMIN_SESSION_SECRET: 세션 쿠키 HMAC 서명 키. 32자 이상 강한 무작위.
#     생성: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# ===========================
ADMIN_PASSWORD=change-me-strong-password
ADMIN_SESSION_SECRET=change-me-to-a-long-random-string
```
