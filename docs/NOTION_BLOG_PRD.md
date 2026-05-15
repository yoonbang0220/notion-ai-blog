# Notion CMS 기반 AI 학습 블로그 MVP PRD

> 작성일: 2026-05-16
> 작성자: agent-prd-generator (시니어 서비스 기획자)
> 양식 출처: `.claude/agents/prd-generator.md`

---

## Overview

### What
Notion에 작성한 글을 자동으로 웹사이트에 퍼블리싱하는 **AI 학습 블로그**.
운영자는 Notion DB에서 글을 쓰고 `Status=Published`로 바꾸면, ISR을 통해 60초 이내에 웹에 노출된다.

### Who
- **1차 타겟**: AI를 처음 공부하는 입문자 (비개발자 포함)
- **2차 타겟**: AI 도구·강의·튜토리얼을 찾는 자기학습자

### Why
운영자 본인이 AI 초보이며, 직접 공부·실험한 과정을 강의처럼 공유하고 싶다.
"나도 했으니 너도 할 수 있다"는 공감 기반 콘텐츠로, 입문자들에게 학습 동기와 따라할 수 있는 기준점을 제공한다.

### Goal
AI 초보자가 블로그를 읽고 **"나도 따라할 수 있겠다"는 자신감을 느끼고, 1편 이상의 글을 끝까지 정독**한다.

### How
1. Notion DB를 단일 콘텐츠 소스(SSOT)로 사용 — 운영자는 Notion에서만 작성
2. `notion-to-md`로 마크다운 변환 후 Next.js에서 렌더링
3. 카테고리·태그·검색으로 원하는 글을 빠르게 발견
4. ISR 60초로 운영 부담 최소화 (코드 배포 없이 글 추가)

---

## Context

### User Persona
- **이름**: 김지원 (가상)
- **나이/직업**: 28세 / 마케터 (비개발자)
- **AI 경험**: ChatGPT는 써봤지만 "AI로 뭘 만드는 것"은 막연
- **니즈**: 코딩을 깊이 모르는 사람도 따라할 수 있는 실전 예시
- **불만**: 기존 AI 블로그는 너무 전문적이거나 추상적

### User Flow
1. 검색/SNS로 유입 → 홈 도착
2. 카테고리(AI 강의 / AI 도구 / 실험기 등) 클릭 또는 검색
3. 글 목록에서 제목·태그·요약 확인 후 선택
4. 글 상세에서 코드·이미지 포함 학습 내용 정독
5. 같은 카테고리/태그의 다른 글로 이어 보기

### Use Cases
- **UC1. 검색 유입 입문자**
  - 유저: AI 챗봇 만드는 법을 찾는 비개발자
  - 목표: "GPT API로 챗봇 만드는 법" 학습
  - 시나리오: 검색바에 "챗봇" 입력 → 결과 목록 → 상세 페이지에서 단계 따라하기
- **UC2. 카테고리 탐색**
  - 유저: AI 도구 추천을 모아보고 싶은 사람
  - 목표: 추천 도구 비교
  - 시나리오: 상단 카테고리 "AI 도구" 클릭 → 최신순 목록 → 글 클릭
- **UC3. 운영자 글 발행**
  - 유저: 블로그 운영자(나)
  - 목표: Notion 작성 → 웹 즉시 공개
  - 시나리오: Notion `Status` → `Published` → 60초 내 자동 노출

### Assumptions
- **킬링포인트**: "초보가 쓴 초보 가이드" 톤. 전문 블로그의 진입장벽 해소.
- **장점**: 콘텐츠 작성에만 집중 가능. 코드 배포 없이 글 추가.
- **단점**: 일부 Notion 블록(synced block, 복잡한 embed) 변환 한계.
- **만족 가설**: 입문자가 글을 끝까지 읽고 다음 글로 자연스럽게 이동 → 체류시간·페이지/세션 지표로 검증.
- **불만족 가설**: 초기 글 수 부족 시 검색 결과가 빈약해 이탈 → 카테고리 진입 강화 필요.

---

## Output

### 주요 기능 명세서

| 기능명 | 설명 | 우선순위 | 비고 |
|---|---|---|---|
| Notion 콘텐츠 동기화 | `@notionhq/client`로 DB 조회 + `notion-to-md` 변환 | P0 | ISR 60s |
| 글 목록 페이지 | 발행된 글을 카드 그리드로 나열, 최신순 | P0 | 페이지네이션은 Future |
| 글 상세 페이지 | 마크다운 렌더, 코드 하이라이트, 이미지 | P0 | slug 동적 라우팅 |
| 카테고리 필터 | Notion select 속성 기반 분류 | P0 | `/category/[slug]` |
| 태그 필터 | Notion multi-select 기반 분류 | P0 | `/tag/[slug]` |
| 검색 | 제목·요약 기준 클라이언트 사이드 키워드 매칭 | P0 | 글 100개 이하 가정 |
| 홈(최신 글) | Hero + 카테고리 칩 + 최신 글 6개 | P0 | |
| 다크모드 | 스타터킷 next-themes 그대로 활용 | P1 | 이미 구현됨 |
| 댓글(Giscus) | 독자 피드백 | Future | |
| RSS 피드 | 구독자 확보 | Future | |
| 시리즈/강의 그룹 | 연재 묶음 | Future | |
| OG 이미지 자동 생성 | SNS 공유 최적화 | Future | |

### IA
```
/                    홈 (Hero + 카테고리 칩 + 최신 글 6개)
├─ /posts            전체 글 목록 + 검색바
├─ /posts/[slug]     글 상세
├─ /category/[slug]  카테고리별 목록
├─ /tag/[slug]       태그별 목록
├─ /about            운영자 소개 ("나도 했으니 너도" 스토리)
└─ /api/revalidate   (선택) Notion 외부 자동화 webhook 수신
```

### Wire-frame (텍스트 와이어)
- **홈**: 상단 Hero(슬로건 + 한 줄 소개) → 카테고리 칩 가로 스크롤 → 최신 글 카드 그리드 3×2 → 푸터
- **글 목록**: 상단 검색바 → 좌측 사이드(또는 상단) 카테고리/태그 필터 → 우측 카드 리스트(커버·제목·요약·태그·날짜)
- **글 상세**: 상단 카테고리·태그·발행일 메타 → 제목 → 커버 이미지 → 본문(마크다운) → 하단 "같은 카테고리 추천 3개" → 푸터

### 기획안

**1. Notion 데이터 모델**
- Notion에 `Posts` Database 생성
- 속성: `Title`(title), `Slug`(text, unique), `Status`(select: Draft/Published), `Category`(select), `Tags`(multi-select), `Summary`(text), `Cover`(file/url), `PublishedAt`(date)
- `Status=Published`만 웹에 노출

**2. 콘텐츠 페치 레이어**
- `lib/notion.ts` 신규: `getPosts()`, `getPostBySlug(slug)`, `getCategories()`, `getTags()`
- 캐시: Next.js 16 `"use cache"` 또는 `revalidate: 60`
- 환경변수: `NOTION_TOKEN`, `NOTION_DATABASE_ID` (서버 전용, `NEXT_PUBLIC_` 미사용)

**3. 마크다운 렌더**
- `react-markdown` + `remark-gfm` + `rehype-highlight`(또는 `shiki`)
- 이미지: `next/image`로 래핑해 LCP 최적화

**4. 검색 UX**
- 글 100개 이하 가정 → 클라이언트 사이드 필터
- 빌드 시 메타데이터(`title`/`summary`/`tags`)를 단일 JSON으로 한 번 fetch → 단순 `includes` 또는 `fuse.js`
- 100개 초과 시 → Future work(Algolia/Meilisearch)

**5. 갱신 방식**
- 기본: ISR `revalidate = 60`
- 선택(권장 Future): Notion 자체 webhook 없으므로 Make/Zapier로 `/api/revalidate` POST → on-demand revalidate

### DataTable

| 데이터타입 | 한글명 | 영문명 | 컬럼설명 |
|---|---|---|---|
| string | 글 제목 | title | Notion title 속성. 페이지 헤더 표시 |
| string (unique) | 슬러그 | slug | URL 경로. 중복 시 빌드 실패 처리 |
| enum | 상태 | status | `Draft` / `Published`. Published만 노출 |
| string | 카테고리 | category | 단일 select. 예: `AI강의`, `AI도구`, `실험기` |
| string[] | 태그 | tags | multi-select. 예: `GPT`, `Python`, `입문` |
| string | 요약 | summary | 목록 카드 본문 + meta description |
| string (url) | 커버 이미지 | coverUrl | Notion file URL → next/image 재호스팅 권장 |
| Date | 발행일 | publishedAt | 정렬·표시 |
| markdown | 본문 | content | notion-to-md 변환 결과 |

---

## 기술 스택
- **프론트엔드**: Next.js 16.2.4 (App Router, RSC + ISR), React 19, TypeScript 5
- **스타일링 & UI**: Tailwind v4, shadcn/ui (base-nova, `@base-ui/react`), lucide-react
- **백엔드 & 데이터베이스**: Notion API (`@notionhq/client`), `notion-to-md`. 별도 DB 없음
- **마크다운 렌더**: react-markdown + remark-gfm + rehype-highlight (또는 shiki)
- **배포 & 호스팅**: Vercel (ISR + Edge), 도메인 추후 확정
- **패키지 관리**: npm

---

## 일정

### Future work
- 댓글(Giscus)
- RSS / Atom 피드
- 시리즈/강의 그룹화
- 다국어 지원
- 뉴스레터 구독
- 조회수·좋아요 (Vercel KV)
- OG 이미지 자동 생성
- 서버사이드 검색 (글 100개 초과 시 Algolia/Meilisearch)

### Task and timeline (파트타임 3주 기준)

| 주차 | 작업 | 산출물 |
|---|---|---|
| W1 | Notion DB 설계, `@notionhq/client` 연동, `lib/notion.ts` 구현 | `.env.local`, `lib/notion.ts` |
| W1 | 글 목록 + 글 상세(마크다운 렌더) | `/posts`, `/posts/[slug]` |
| W2 | 카테고리·태그 필터 페이지 | `/category/[slug]`, `/tag/[slug]` |
| W2 | 검색바(클라이언트), 홈 페이지 | `/`, 검색 UI |
| W3 | ISR 60초 설정, 시드 글 10편 작성, Vercel 배포 | 도메인 연결, 정식 오픈 |
| W3 | 카피·디자인 다듬기 ("초보 톤" 검수) | 런칭 |

---

## 참고 사항

### MVP 원칙 (포함/제외 판단)
- **포함**: 목록·상세·카테고리·태그·검색 → Goal(따라할 수 있는 느낌) 검증에 필수
- **제외(Future)**: 댓글·RSS·시리즈·다국어 → 콘텐츠 발견·정독 검증에는 불필요
- **검색 포함 이유**: 초보 타겟이 키워드로 유입되는 비중이 높고, 카테고리만으로는 발견성이 부족

### 반드시 해야할 기술 스택
- Notion 공식 클라이언트(`@notionhq/client`) 사용. 비공식 API 금지.
- Next.js 16 `cacheComponents` (`"use cache"`) 또는 `revalidate` 활용.
- Notion 토큰은 서버 컴포넌트/Route Handler에서만 사용. `NEXT_PUBLIC_*` 금지.

### 처리 프로세스 (정합성 보장)
1. **수집**: Notion API DB 쿼리 (`filter: Status=Published`)
2. **변환**: notion-to-md → 마크다운 + 메타데이터 파싱
3. **캐싱**: ISR 60초 (빌드 시 SSG + 런타임 재생성)
4. **노출**: Next.js 페이지 렌더링
5. **정합성 규칙**:
   - Slug 중복 시 빌드 실패 처리
   - 필수 속성(`title`/`slug`/`status`/`category`) 누락 글은 스킵 + 콘솔 경고
   - 커버 이미지 만료 대비 — `next/image` 재호스팅

### 정합성 검증 체크리스트
- [x] Goal(초보가 따라할 수 있는 느낌)과 핵심 기능(목록·상세·카테고리·태그·검색)이 연결되어 있는가
- [x] DataTable이 기능 명세와 1:1 매핑되는가
- [x] MVP 범위를 벗어난 기능(댓글·RSS·시리즈)이 포함되지 않았는가 → Future로 분리
- [x] Future work 항목이 명확히 정리되어 있는가
