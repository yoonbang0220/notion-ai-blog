---
name: w2-korean-font-pretendard
description: W2 한글 폰트 Pretendard 변수폰트 임베드 — CDN 함정·next/font/local 설정·display:block 근거
metadata:
  type: project
---

W2 한글 폰트 임베드(T2.2) 확정 사실. PDF·전 사이트 본문 폰트.

- 폰트: **Pretendard 변수 폰트 1개** `public/fonts/PretendardVariable.woff2`(약 2MB, OFL 라이선스). 파일 수 최소화로 변수폰트 채택.
- ⚠️ **CDN 함정**: jsDelivr 의 `gh` 엔드포인트(`cdn.jsdelivr.net/gh/orioncactus/pretendard/...`)는 **"Package size exceeded 50MB"** 로 실패(168B ASCII 에러 응답). 변수폰트 버전태그 경로도 404.
  - **작동하는 URL**: `https://cdn.jsdelivr.net/npm/pretendard@latest/dist/web/variable/woff2/PretendardVariable.woff2`(npm 엔드포인트). 다운로드 후 매직바이트 `wOF2` 로 검증.

- `next/font/local` 설정(`app/layout.tsx`):
  - `localFont({ src: "../public/fonts/PretendardVariable.woff2", variable: "--font-pretendard", display: "block", weight: "45 920" })`.
  - 변수폰트는 `weight` 에 범위 문자열(`"45 920"`) 지정(Pretendard 변수 weight 범위).
  - `<html className>` 에 `${pretendard.variable}` 를 Geist 변수들 앞에 추가.
  - **CSS 변수명 = `--font-pretendard`** (T2.3 PDF·QuoteView 검수 시 이 이름 사용).

- ⚠️ **`display: "block"` 선택 근거**: 기본은 swap 이지만, PDF 헤드리스 인쇄(T2.3) 시 폴백 폰트로 캡처돼 한글이 깨질 위험. block 은 짧은 차단 기간 동안 텍스트를 숨겼다 폰트 로드 후 표시 → PDF 라우트의 `waitUntil:"networkidle0"` 대기와 결합하면 Pretendard 적용 보장.

- Tailwind v4 배선: `app/globals.css` `@theme inline` 의 `--font-sans: var(--font-pretendard), var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif` (기존 Geist 폴백 유지). `@layer base` 의 `html { @apply font-sans }` 가 전역 적용 → 랜딩 포함 전 사이트 폰트 영향(의도).

관련: [[w2-pdf-chromium-setup]]
