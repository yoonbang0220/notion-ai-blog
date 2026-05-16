---
name: testing-requirements
description: 모든 태스크 DoD 에 테스트 통과를 포함시키고, API/로직은 정상·실패·엣지 3종 시나리오, UI 는 Playwright MCP E2E 를 의무화하는 규칙
metadata:
  type: feedback
---

모든 ROADMAP 태스크에 "테스트" 컬럼 또는 테스트 계획 블록을 의무로 포함시킨다. 분류는 `Playwright E2E | 단위 | 통합 | 수동`.

- API 연동·비즈니스 로직(예: Notion 페치 레이어, webhook): 정상(happy) / 실패(인증·외부 API 에러·빈 응답·타임아웃) / 엣지(경계값·권한·동시성) 3종 시나리오 명시.
- UI/사용자 인터랙션(렌더러·검색·페이지): Playwright MCP 함수(`mcp__playwright__browser_navigate / browser_snapshot / browser_click / browser_fill_form / browser_type / browser_network_request(s) / browser_take_screenshot / browser_console_messages / browser_evaluate / browser_resize`)로 시나리오 작성.
- 순수 ops/copy/문서 작업은 "수동"·"체크리스트"로 간결히 표기. 억지로 Playwright 시나리오 만들지 말 것.
- 로드맵 본문에 `🧪 테스트 전략` 섹션 의무(전반 원칙 + Phase 매트릭스 + Playwright MCP 베이스라인).
- 각 Phase DoD 의 마지막 항목으로 "정의된 테스트 시나리오가 모두 통과(Playwright MCP 실측 포함)" 줄을 추가.

**Why:** 2026-05-17 사용자가 prd-roadmap-architect 에이전트 정의를 강화하면서 명시한 규칙. PRD/로드맵을 실행 단계에서 회귀 없이 안전하게 만들려는 의도.

**How to apply:** 신규 로드맵 작성 시 표 스키마에 "테스트" 컬럼을 처음부터 포함하고, 각 표 아래에 "#### Phase N 테스트 계획" 서브섹션을 만들어 태스크 ID 별 시나리오를 작성한다. 기존 로드맵 보강 요청 시 표 컬럼 추가 + 시나리오 블록 분리(옵션 A) 방식을 기본으로 한다. 테스트 러너(`npm test`)가 미설정인 프로젝트에서는 (a) `npm run build` 타입/Suspense 게이트, (b) `tsx scripts/test/<name>.ts` 임시 스크립트, (c) 콘솔 출력 + 수동 어서션 중 적절한 방식을 안내한다.

관련: [[roadmap-conventions]], [[tech-traps]]
