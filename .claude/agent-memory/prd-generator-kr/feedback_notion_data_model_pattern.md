---
name: feedback-notion-data-model-pattern
description: Notion DB 1개 = 도메인 객체 1개 패턴. child DB 분리는 MVP에서 거의 항상 Future로 미룬다.
metadata:
  type: feedback
---

Notion을 SSOT로 쓰는 MVP에서는 **"DB 1개 + page body 안의 블록(table/markdown 등)으로 디테일 표현"** 패턴을 기본형으로 채택한다. child DB 분리(예: 견적 항목 표를 별도 DB로)는 P0에서 거의 항상 Future로 미룬다.

**Why:** child DB로 분리하면 (1) Integration 권한 연결 단계가 추가되고 (2) 페치 호출이 N+1로 늘고 (3) 운영자(비개발자)가 DB 2개 사이 관계를 직접 관리해야 하는 학습 부담이 생긴다. 운영자 1명·소수 발행자라는 MVP 가정에서 이 비용은 회수되지 않는다. 반대로 page body 안에 단순 `table` 블록 1개로 두면 운영자는 Notion에서 평소 쓰던 방식 그대로 작성한다.

**How to apply:**
- 신규 도메인 PRD를 짤 때 "이 도메인은 1:N 관계가 있나? 그 N을 별도 DB로 빼야 하나?" 를 자문하고, 거의 항상 "page body 블록으로 충분, child DB 는 Future" 로 결정한다.
- 단, N이 (a) 다른 페이지에서 재사용되거나 (b) 100+ 행으로 커지거나 (c) 독립적으로 필터/정렬되어야 하면 그때 child DB로 승격. 이 3개 조건 중 하나도 만족 안 하면 page body 유지.
- 합계·세금 같은 derived 필드는 Notion `formula` 보다 **코드 계산**을 디폴트로 권장. 운영자가 단가만 고치면 자동 재계산되도록.
- 관련 도메인 휴리스틱: [[heuristic-domain-p0-future]]
