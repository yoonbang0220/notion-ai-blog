---
name: notion-slug-formula-filter-trap
description: 슬러그 formula 필터(replaceAll(id(),...))가 Notion v5 query 에서 validation_error 로 실패 — 코드 측 비교 폴백 필요
metadata:
  type: project
---

`슬러그` 속성(formula `replaceAll(id(), "-", "")`)에 대한 `dataSources.query` 필터가
실 Notion API 에서 `validation_error: Unable to filter based on a formula of unknown type`
로 실패한다. `formula: { string: { equals } }` · `rich_text: { equals }` · AND 조합 3종
모두 동일 실패(2026-05-20 실측, requestId 다수 확인).

원인: `id()` 함수 결과의 formula 출력 타입을 Notion 서버 필터 엔진이 결정하지 못함.
단, **페이지 응답**에서는 `formula.type === "string"` 으로 정상 평가된다(프로브 확인).

**Why:** Notion formula 2.0 엔진의 알려진 제약. 속성 정의(`dataSources.retrieve`)에는
expression 만 있고 출력 타입 메타가 없어 필터가 타입을 추론 못 함.

**How to apply:** slug 로 견적을 찾을 때 query 필터에 slug 를 넣지 말고,
`상태=발행` 필터로만 페치한 뒤 코드에서 `getFormulaString(page.properties["슬러그"]) === slug`
비교(start_cursor 페이지네이션). 시드 규모가 작아(MVP 수십 건) 비용 무시 가능.
실측: 실 slug → 1건, 없는 slug → 0건 정상.

⚠️ `lib/quotes.ts::getQuoteBySlug`(T1.2)는 여전히 formula 필터를 쓰므로 **실행 시 throw 한다**
(T1.3 범위 밖 — 메인 에이전트/운영자에게 보고함). T1.5 페이지 셸 작업 전 반드시 수정 필요.
관련: [[quote-seed-data]]
