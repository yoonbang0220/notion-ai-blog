# 노션 기반 견적서 웹뷰어 + PDF 다운로드 MVP PRD

> 작성일: 2026-05-17
> 작성자: prd-generator-kr (시니어 서비스 기획자)
> 양식 출처: `docs/MVP PRD 양식.md`, 스타일 참고: `docs/NOTION_BLOG_PRD.md`

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
- 함수: `getQuoteBySlug(slug)` 1개로 시작. 목록 조회는 운영자가 Notion에서 직접 보면 되므로 만들지 않는다.
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
