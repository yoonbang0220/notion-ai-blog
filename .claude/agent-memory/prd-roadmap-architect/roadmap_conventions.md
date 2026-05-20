---
name: roadmap-conventions
description: 이 프로젝트의 로드맵 작성 컨벤션 (기간·태스크 ID·Size·담당 영역·견적서 도메인 기준)
metadata:
  type: project
---

PRD의 일정 표기를 따라 로드맵은 **파트타임 2주(W1/W2)** 단위로 구성한다. W0 초기화는 이미 완료된 상태로 짧게만 표기.

- **태스크 ID**: `T<주차>.<번호>` (예: `T1.3`, `T2.4`). Phase 0 사전 준비는 `T0.x` (완료 표기만).
- **Size**: S(<2h) / M(0.5~1d) / L(1~2d) / XL(>2d). 파트타임 기준이므로 캘린더 데이가 아닌 작업 시간.
- **담당 영역 키워드**: `infra` / `data` / `ui` / `qa` / `ops` / `copy` / `pdf` / `seo`.
- **마일스톤 테마(견적서 도메인 기준)**:
  - W0 = 도메인 전환 초기화 (완료)
  - W1 = Notion `Quotes` 페치 + `/q/[slug]` 렌더 + 항목 표 파싱 + 합계 계산
  - W2 = PDF 라우트 + on-demand revalidate webhook + robots/noindex + Playwright E2E
- **Future Work 우선순위**: 임팩트(1~5) - 노력(1~5) 점수로 정렬(높을수록 우선). 트리거 조건(언제 들어가야 하는지)을 함께 명시.

**Why**: PRD가 W1~W2 일정으로 작성되어 있고, 운영자 1인 파트타임 가정이라 단순한 주차 단위가 가장 잘 맞는다. 블로그 시절 3주 컨벤션에서 2주로 축소된 이유는 견적서 MVP 범위가 더 좁기 때문.

**How to apply**: 로드맵 업데이트 시 위 형식 유지. 새 라이브러리(`@sparticuz/chromium`, `puppeteer-core`, `nanoid` 등) 설치 의사결정은 해당 태스크 직전으로 표기. 관련: [[tech-traps]], [[testing-requirements]].
