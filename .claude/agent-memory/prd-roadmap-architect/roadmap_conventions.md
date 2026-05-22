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
- **담당 영역 키워드(추가)**: `security`(인증·세션·접근통제) / `BE`(서버 로직). PRD 부록 A 고도화부터 등장.
- **마일스톤 테마(견적서 도메인 기준)**:
  - W0 = 도메인 전환 초기화 (완료)
  - W1 = Notion `Quotes` 페치 + `/q/[slug]` 렌더 + 항목 표 파싱 + 합계 계산
  - W2 = PDF 라우트 + on-demand revalidate webhook + robots/noindex + Playwright E2E
  - **W3 = Phase 3 v1.x 고도화** (2026-05-22 추가, PRD 부록 A 기반): 운영자 관리 화면 — `/admin` 인증 게이트(T3.1) + 견적 목록 페치 `queryPublishedQuotes()`(T3.2) + `/admin` 목록 페이지(T3.3) + 링크 복사 버튼(T3.4) + 다크모드 검증·문서화(T3.5, 신규 빌드 아님).
- **Phase 번호 vs Future 매트릭스**: 구현 단계는 `Phase N (Wn)`. **Future 우선순위 매트릭스는 항상 가장 큰 Phase 번호**(현재 Phase 4). 새 구현 Phase 추가 시 Future 매트릭스를 한 칸 뒤로 리네이밍하고, 본문의 `Future(Phase N)` 참조를 모두 갱신할 것(특히 자동 차단·통계 대시보드 같은 항목).
- **Future Work 우선순위**: 임팩트(1~5) - 노력(1~5) 점수로 정렬(높을수록 우선). 트리거 조건(언제 들어가야 하는지)을 함께 명시.
- **보안 선행 게이트 패턴**: 인증/접근통제가 다른 기능의 전제일 때(예: `/admin` 인증 → 목록·복사), 인증 태스크를 **선행 P0** 로 고정하고 의존 태스크 DoD/리스크에 "인증 검증 전 배포 금지"(배포 게이트) 를 명시한다. 노출 시 데이터 유출(전체 slug)이 일어나기 때문.

**Why**: PRD가 W1~W2 일정으로 작성되어 있고, 운영자 1인 파트타임 가정이라 단순한 주차 단위가 가장 잘 맞는다. 블로그 시절 3주 컨벤션에서 2주로 축소된 이유는 견적서 MVP 범위가 더 좁기 때문.

**How to apply**: 로드맵 업데이트 시 위 형식 유지. 새 라이브러리(`@sparticuz/chromium`, `puppeteer-core`, `nanoid` 등) 설치 의사결정은 해당 태스크 직전으로 표기. 관련: [[tech-traps]], [[testing-requirements]].
