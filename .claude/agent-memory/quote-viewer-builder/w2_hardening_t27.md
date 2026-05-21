---
name: w2-hardening-t27
description: T2.7 배포 전 하드닝 — error.tsx 경계·in-memory 레이트리밋·Pretendard 폰트 서브셋(KS X 1001) 구현 위치·측정값
metadata:
  type: project
---

T2.7 배포 전 하드닝(2026-05-21 구현). 3개 산출물 위치·확정 사실.

**1. 전역 에러 경계** — `app/error.tsx`(`"use client"` 필수). `getQuoteBySlug` 중복 slug throw(정합성 규칙 1)·Notion 실패가 이 경계로 떨어짐. 원본 `error.message` 화면 비노출(C2 원칙) — `console.error(error)` 로만. "다시 시도"(`reset`)·"홈으로"(`Link href="/"`) 버튼. dev 모드엔 Next.js issues 오버레이가 별도 포털로 뜨지만 production 엔 없음(error.tsx 본문 DOM 엔 비밀 메시지 미노출 실측).

**2. 레이트리밋(best-effort, in-memory)** — `lib/rate-limit.ts`(⚠️ `server-only` 미import — 테스트가 직접 import). 고정 윈도우 Map. export: `checkRateLimit(key,limit,windowMs)`·`getClientIp(req)`(x-forwarded-for 첫값→x-real-ip→"unknown")·`tooManyRequestsResponse(retryAfterSeconds)`(429+Retry-After)·`RATE_LIMITS`(pdf 10/분, revalidate 30/분)·`__resetRateLimitStore()`(테스트용). 적용: `app/q/[slug]/pdf/route.ts`(키 `pdf:<ip>:<slug>`, slug await 직후·getQuoteBySlug 전 — 무효 slug 도 빠르게 429 검증 가능)·`app/api/revalidate/route.ts`(키 `revalidate:<ip>`, 인증 전). ⚠️ 서버리스 인스턴스 간 미공유 → best-effort(분산 KV 는 백로그). 테스트 `scripts/test/rate-limit.ts`(`npm run test:rate-limit`, 5/5 — 단위 3 + 통합 2). pdf route 의 NextRequest 파라미터는 `_req`→`req` 로 개명(이제 활발히 사용).

**3. Pretendard 폰트 서브셋** — `scripts/subset-font.ts`(`subset-font`@npm, harfbuzz wasm). 출력 `public/fonts/PretendardVariable.subset.woff2`. **원본 `PretendardVariable.woff2`(2MB)는 제거됨** — 재취득은 npm CDN(메모리 [[w2-korean-font-pretendard]]). `layout.tsx` src 가 subset 파일 가리킴(variationAxes 미지정 → weight 변수축 유지).
- ⚠️ **측정값(woff2)**: ASCII+기호만 58.7KB / +한글음절전체(11172, U+AC00–D7A3) 1714KB(원본대비 14.7%↓ 그침) / **+KS X 1001 상용 2350자 452KB(77.5%↓, 채택)**. 한글 글리프가 폰트 용량 대부분(~1655KB). 음절전체는 목표(수백KB) 미달이라 상용 2350자 선택.
- ⚠️ **KS X 1001 2350자 생성법**: 외부 데이터 없이 `new TextDecoder("euc-kr")` (Node 내장)로 EUC-KR 0xB0A1~0xC8FE(행 0xB0~0xC8 × 열 0xA1~0xFE) 디코딩 → 정확히 2350자. `0xB0A1`="가".
- ⚠️ **트레이드오프**: 회사명·고유명사의 비상용 음절(예: 쀼·똠)은 폴백 폰트 렌더(□ 아님). 운영 중 누락 발견 시 subset-font.ts 를 음절전체로 회귀.
- 실측(Playwright, 너비 비교법 — Pretendard vs serif 너비 다르면 글리프 존재): 견적 active 56자/expired 58자/랜딩 99자/print미디어 52자 모두 **폴백 0건**. `document.fonts` 에 `pretendard|loaded` 확인.

검증 전부 PASS: tsc·lint 무경고, build 라우트 출력 유지, test:quotes 10/10·pdf-route 5/5·revalidate 9/9·rate-limit 5/5.
관련: [[w2-korean-font-pretendard]], [[w2-pdf-chromium-setup]], [[nextjs16-revalidatetag-two-arg]]
