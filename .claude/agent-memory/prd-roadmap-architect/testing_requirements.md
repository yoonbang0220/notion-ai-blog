---
name: testing-requirements
description: 모든 태스크 DoD 에 테스트 통과를 포함시키고, API/로직은 정상·실패·엣지 3종 시나리오, UI 는 Playwright MCP E2E 를 의무화하는 규칙 (견적서 도메인 베이스라인 포함)
metadata:
  type: feedback
---

모든 ROADMAP 태스크에 "테스트" 컬럼 또는 테스트 계획 블록을 의무로 포함시킨다. 분류는 `Playwright E2E | 단위 | 통합 | 수동`.

- **API 연동·비즈니스 로직** (예: `lib/quotes.ts`, `/api/revalidate`, 합계 계산): 정상(happy) / 실패(인증·외부 API 에러·빈 응답·타임아웃) / 엣지(경계값·중복 slug·필수 속성 누락·표 컬럼 약속 위반) 3종 시나리오 명시.
- **UI/사용자 인터랙션** (`/q/[slug]` 렌더·모바일 반응형·만료 배너): Playwright MCP 함수(`mcp__playwright__browser_navigate / browser_snapshot / browser_click / browser_fill_form / browser_type / browser_network_request(s) / browser_take_screenshot / browser_console_messages / browser_evaluate / browser_resize`)로 시나리오 작성.
- **PDF 라우트**: `browser_network_request` 로 `Content-Type: application/pdf` / `Content-Disposition` 한글 파일명 / 응답 크기·시간 측정. 헤드리스 Chromium 출력은 별도 PDF 파서 또는 시각 검수.
- 순수 ops/copy/문서 작업은 "수동"·"체크리스트"로 간결히 표기. 억지로 Playwright 시나리오 만들지 말 것.
- 로드맵 본문에 `🧪 테스트 전략` 섹션 의무(전반 원칙 + Phase 매트릭스 + Playwright MCP 베이스라인 + 시드 견적 정책).
- 각 Phase DoD 의 마지막 항목으로 "정의된 테스트 시나리오가 모두 통과(Playwright MCP 실측 포함)" 줄을 추가.

**견적서 도메인 시드 데이터 정책**:
- 시드 견적 최소 2건: 정상 1건 + 만료(`validUntil` 과거) 1건. 슬러그에 `regression-seed-active`, `regression-seed-expired` 같이 식별 접두 사용.
- 시드 생성은 운영자가 Notion에서 수동 입력 (PRD 가정). 시드 생성 절차는 W2 Playwright E2E 태스크의 선행 작업으로 별도 태스크화.
- Playwright 시나리오는 항상 시드를 우선 사용 (랜덤 견적은 불안정).

**Why:** 2026-05-17 사용자가 prd-roadmap-architect 에이전트 정의를 강화하면서 명시한 규칙. PRD/로드맵을 실행 단계에서 회귀 없이 안전하게 만들려는 의도. 견적서는 결재용 문서이므로 시각·금액 정합성 회귀가 비즈니스 손상으로 직결.

**How to apply:** 신규 로드맵 작성 시 표 스키마에 "테스트" 컬럼을 처음부터 포함하고, 각 표 아래에 "#### Phase N 테스트 계획" 서브섹션을 만들어 태스크 ID 별 시나리오를 작성한다. 테스트 러너(`npm test`)가 미설정인 프로젝트에서는 (a) `npm run build` 타입/Suspense 게이트, (b) `tsx scripts/test/<name>.ts` 임시 스크립트, (c) Playwright MCP 실측 중 적절한 방식을 안내한다.

관련: [[roadmap-conventions]], [[tech-traps]], [[project-identity]].
