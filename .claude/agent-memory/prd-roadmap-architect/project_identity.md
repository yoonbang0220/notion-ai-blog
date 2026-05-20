---
name: project-identity
description: 이 저장소가 무엇인지, 어디서 진실의 출처를 찾는지에 대한 정체성 정보 (견적서 뷰어 도메인)
metadata:
  type: project
---

이 저장소는 **Notion 기반 견적서 웹뷰어 + PDF 다운로드 MVP** 다. 운영자가 Notion `Quotes` DB 행을 `Status=Published` 로 바꾸면, 추측 불가능한 32자 이상 slug를 가진 공유 URL(`/q/[slug]`)이 활성화되고, 클라이언트는 로그인 없이 열람·PDF 다운로드 가능.

- **PRD SSOT**: `docs/QUOTE_VIEWER_PRD.md` (2026-05-17 작성).
- **로드맵**: `docs/ROADMAP.md` (2026-05-17 견적서 도메인 기준 재작성). 변경 이력 섹션 유지.
- **타겟 운영자**: 박상준(35세, 디자인 에이전시 대표) — 디지털 숙련도 높음. Notion·Vercel 이해.
- **타겟 클라이언트**: 김혜진(40대, 중소기업 대표) — 디지털 숙련도 낮음. 모바일 카톡 인앱 브라우저에서 먼저 열람.
- **킬링포인트**: "Notion에서 한 번 쓰면 끝. 수정도 같은 링크. PDF는 1클릭."
- **MVP 일정**: 파트타임 2주 (W1 데이터+렌더 / W2 PDF+webhook+robots+E2E). W0 초기화 완료.
- **이전 도메인**: Notion CMS 블로그 → 폐기. 블로그 PRD/ROADMAP/Shrimp 태스크는 `docs/archive/` 로 이동.

**Why**: 새 작업 시 PRD/ROADMAP 두 문서가 단일 출처임을 잊지 않기 위함. 도메인이 블로그→견적서로 전환된 이력 보존.

**How to apply**: 새 기능 요청 시 먼저 PRD에 반영되어 있는지 확인, 없으면 PRD 갱신 → 로드맵 갱신 순서. Future Work 항목은 [[roadmap-conventions]] 의 우선순위 점수 기준으로 정렬.
