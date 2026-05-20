---
name: heuristic-pdf-generation-decision
description: 한글 결재용 PDF가 필요할 때 — 헤드리스 Chromium(@sparticuz/chromium)이 디폴트. window.print()는 다운그레이드, @react-pdf/renderer는 일관성 우위지만 표·폰트 코스트 큼.
metadata:
  type: feedback
---

웹 → PDF 변환이 P0인 MVP에서는 **헤드리스 Chromium (`@sparticuz/chromium` + `puppeteer-core`) on Vercel Function** 을 디폴트로 선택한다. 이유는 "화면 = PDF" 자동 보장 + 한글 폰트 임베드 용이성 + 표 레이아웃 그대로 유지.

대안 비교:
- **`window.print()` + 인쇄 전용 CSS**: 비용 0, 콜드스타트 0. 단점은 클라이언트 브라우저(Safari/Chrome/카톡 인앱 등)별 결과가 달라 결재용 일관성 보장 불가. → 운영자가 비용·콜드스타트를 우려할 때 다운그레이드 옵션.
- **`@react-pdf/renderer`**: 서버 일관성은 우수. 단점은 (a) 한글 폰트 등록 별도 작업, (b) 복잡한 표 레이아웃을 React 컴포넌트로 재작성, (c) 화면 UI와 PDF UI 이중 유지보수. → 견적서·계약서처럼 표가 핵심이면 비추.

**Why:** 한글 결재 문서는 사내 시스템에 그대로 첨부되어 인쇄·아카이브된다. "휴대폰에서 본 PDF" 와 "PC에서 본 PDF" 가 다르면 신뢰성 사고가 난다. 헤드리스 Chromium은 서버에서 동일 환경으로 인쇄하므로 클라이언트 브라우저 편차를 제거한다. 콜드스타트 1~3초는 결재용 PDF 다운로드 UX에서 충분히 수용 가능.

**How to apply:**
- PDF가 P0인 PRD에서는 [기획안]·[기술 결정] 절에 `@sparticuz/chromium` + `puppeteer-core` 를 명시하고, Vercel Function 메모리 1024MB+ 권장을 함께 적는다.
- 한글 폰트는 Pretendard 또는 Noto Sans KR을 `next/font/local` 로 임베드.
- PDF 라우트는 같은 페이지를 `?print=1` 쿼리로 재방문하는 패턴(`/q/[slug]/pdf` → 내부적으로 `/q/[slug]?print=1` 인쇄)이 코드 재사용에 가장 좋다.
- 열린 질문에 "비용 우려 시 `window.print()` 다운그레이드 가능" 옵션을 명시해 운영자가 의사결정 할 수 있게 한다.
- 관련: [[project-repo-context]]
