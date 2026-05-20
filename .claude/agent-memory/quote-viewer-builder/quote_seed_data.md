---
name: quote-seed-data
description: Notion 회귀 시드 견적 2건의 실제 슬러그·항목·합계 값 (자기검증 기대값)
metadata:
  type: reference
---

Notion 회귀 시드(`[regression-seed-*]` 접두) 실측값. `scripts/test/quotes-client.ts`
시나리오 기대값 출처. `.env.local` 의 `SEED_SLUG_ACTIVE`/`SEED_SLUG_EXPIRED` 가 가리킴.

**active 시드** (`SEED_SLUG_ACTIVE`):
- 제목 `[regression-seed-active] ABC 로고 견적`, 고객사 ABC 주식회사, 유효기간 2027-12-31(미만료)
- 슬러그 `36378466f72781dfa403cb8e2a719380`, invoiceId `36378466-f727-81df-a403-cb8e2a719380`
- 항목 2건: 명함 디자인(2 × 200000), 로고 디자인(1 × 1500000)
- 합계: subtotal 1,900,000 / 부가세율 10% → tax 190,000 / total 2,090,000

**expired 시드** (`SEED_SLUG_EXPIRED`):
- 제목 `[regression-seed-expired] XYZ 만료 견적`, 고객사 XYZ 주식회사, 유효기간 2024-01-31(만료)
- 슬러그 `36378466f72781f09b60c3ccdd1ca592`
- 항목 1건: 컨설팅 (만료) (1 × 500000) → subtotal 500,000 / 부가세 10% 50,000 / total 550,000
- 만료 배너 ARIA: `alert` "유효기간이 만료되었습니다." (T1.7 Playwright 실측 2026-05-21).
  active 시드(유효기간 2027-12-31)에는 이 alert 없음.

**How to apply:** relation 필터(`견적 contains invoiceId`)가 견적별로 항목을 정확히
분리함을 실측 — active 2건/expired 1건 교차 누출 없음. T1.5+ 만료 배너 검증은 expired 시드 사용.
data_source_id: Invoice `36378466-f727-809a-95e1-000bb090aee6`, Items `36378466-f727-80cf-a93a-000b7cc5a3be`.
관련: [[notion-slug-formula-filter-trap]]
