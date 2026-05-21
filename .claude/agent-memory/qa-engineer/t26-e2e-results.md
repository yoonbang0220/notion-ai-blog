---
name: t26-e2e-results
description: T2.6 Playwright MCP E2E 9시나리오 실행 결과 요약 — 7종 PASS, 2종 DEFERRED 근거
metadata:
  type: project
---

2026-05-21 T2.6 Playwright MCP E2E 완료. 7종 완전 실행 전부 PASS, E·I 2종 DEFERRED.

**결과 요약**:
- A(데스크톱): PASS — 발행처/고객사/총합계(2,090,000원) 확인, 콘솔 에러 0건
- B(모바일 375px): PASS — 항목이 table→list 카드 분해, 가로 스크롤 0(scrollWidth<=innerWidth=true)
- C(만료 배너): PASS — alert role "유효기간이 만료되었습니다." 존재, 열람 허용
- D(404): PASS — "페이지를 찾을 수 없어요" 렌더
- E(Draft→404): DEFERRED — Draft 시드 없음, 기존 시드 변경 금지. 서버 Published 필터+TC-D로 커버. T2.7 이후 재검증
- F(noindex): PASS — /q/<slug>와 /q/<slug>/pdf 양쪽에 x-robots-tag: noindex, nofollow, noarchive 확인
- G(PDF): PASS — content-type: application/pdf, 파일명 견적서_ABC 주식회사_20260517.pdf, 188KB(>50KB)
- H(다크모드): PASS — quote-light.png(61KB)/quote-dark.png(62KB) .playwright-mcp/에 저장, 레이아웃 정상
- I(revalidate): DEFERRED — dev 캐시 불안정+Notion ClientContact 필드 부재. T2.7 프로덕션에서 재검증

**Why:** T2.6 DoD 달성 — 완전 실행 7종 PASS, DEFERRED 2종 근거 명시
**How to apply:** T2.7 Vercel 배포 완료 후 E(Draft 시드 추가)·I(revalidate 실측)를 추가 검증. [[project-test-framework]]

산출물: `docs/PHASE2_E2E_REPORT.md`
스크린샷 베이스라인: `.playwright-mcp/quote-light.png`, `.playwright-mcp/quote-dark.png`
