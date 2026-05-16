---
name: roadmap-conventions
description: 이 프로젝트의 로드맵 작성 컨벤션 (기간·태스크 ID·Size·담당 영역)
metadata:
  type: project
---

PRD의 일정 표기를 따라 로드맵도 **파트타임 3주(W1/W2/W3)** 단위로 구성한다.

- **태스크 ID**: `T<주차>.<번호>` (예: `T1.3`, `T2.4`). Phase 0 사전 준비는 `T0.x`.
- **Size**: S(<2h) / M(0.5~1d) / L(1~2d) / XL(>2d). 파트타임 기준이므로 캘린더 데이가 아닌 작업 시간.
- **담당 영역 키워드**: `infra` / `data` / `ui` / `qa` / `ops` / `copy`.
- **마일스톤 테마(고정)**:
  - W1 = 데이터 파이프라인 + 글 상세 렌더 (`lib/notion.ts` 본격 구현)
  - W2 = 발견성 (카테고리/태그/검색/홈)
  - W3 = 운영 안정화 + 런칭 (ISR, webhook, 시드 글, Vercel, 도메인)

**Why**: PRD가 W1~W3 일정으로 작성되어 있고, 운영자 1인 파트타임 가정이라 단순한 주차 단위가 가장 잘 맞는다.

**How to apply**: 로드맵 업데이트 시 위 형식 유지. 새 Future Work 우선순위는 임팩트(1~5) - 노력(1~5) 점수로 정렬(높을수록 우선). 관련: [[tech-traps]].
