---
name: nextjs16-cache-components-params-gate
description: Next.js 16 Cache Components 빌드 게이트 — params await 위치 + middleware→proxy 리네임 + cacheLife/cacheTag stable import
metadata:
  type: project
---

Next.js 16.2.6(`cacheComponents: true`) 동적 라우트 `/q/[slug]` 구현에서 실측한 빌드 게이트 사실들.

**1. `params` await 위치 — 셸에서 await 하면 빌드 실패**
`page.tsx` 본문에서 `const { slug } = await params` 하면 빌드가
`Route "/q/[slug]": Uncached data was accessed outside of <Suspense>` (debug-prerender 트레이스가 `QuotePage` 지목)로 실패한다. `params` 자체가 request-time(동적) 값이라 정적 셸 prerender 를 막는다.
- **해결 패턴**: 셸은 `params` Promise 를 await 하지 않고 그대로 `<Suspense>` 안의 중간 컴포넌트(`QuoteResolver`, 캐시 아님)로 넘긴다 → 거기서 `await params` → 풀린 `slug`(string) 만 `"use cache"` 컴포넌트(`QuoteData`)로 전달.
- `generateMetadata` 의 `await params` 는 별도 평가 경로라 **허용**(빌드 통과).
- 결과: `/q/[slug]` 가 `◐ (Partial Prerender)` — 정적 셸 + 동적 server-streamed.
- 구현 위치: `app/q/[slug]/page.tsx`(QuotePage 셸 + QuoteResolver), `app/q/[slug]/quote-data.tsx`(QuoteData "use cache").

**Why:** Cache Components 는 정적 셸을 prerender 하려 하는데, 셸 동기 경로에서 request-time 값(params)을 건드리면 prerender 불가 → 에러.
**How to apply:** 다른 동적 라우트(`/q/[slug]/pdf` 등) 추가 시에도 동일 — params/searchParams await 는 Suspense 경계 안으로, cache 컴포넌트엔 plain 값만.

**2. `cacheLife`/`cacheTag` 는 stable export (unstable_ 아님)**
`import { cacheLife, cacheTag } from "next/cache"`. Shrimp 가이드의 `unstable_cacheLife`/`unstable_cacheTag` 표기는 stale.
출처: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/{cacheLife,cacheTag}.md`.
`cacheLife("minutes")` 프로파일 = stale 5m / revalidate 1m / expire 1h (단기 게이트에 안 걸림). 캐시 태그 규칙 `quote:${slug}`.

**3. middleware → proxy 리네임 (16.0 deprecated)**
`middleware.ts` 컨벤션은 deprecated, `proxy.ts` + `export function proxy(request)` + `export const config = { matcher }` 로 대체됨(기능 동일). CLAUDE.md/ROADMAP/Shrimp 가이드의 `middleware.ts` 표기는 구버전. noindex 헤더는 `proxy.ts` 에서 `/q/:path*` 매처로 `X-Robots-Tag: noindex, nofollow, noarchive` set. 빌드 출력에 `ƒ Proxy (Middleware)` 로 표기.
출처: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` ("The `middleware` file convention is deprecated and has been renamed to `proxy`").
codemod: `npx @next/codemod@canary middleware-to-proxy .`

**4. notFound() + "use cache" 양립**
`notFound()` 는 `NEXT_HTTP_ERROR_FALLBACK;404` throw(control-flow)라 cache 컴포넌트 안에서 호출 가능. cacheLife 문서의 조건부 분기 예시(`if(!post){cacheLife('minutes');return null}`)와 동일 패턴. 형식 위반/미공개 slug → 404 UI(`app/not-found.tsx`) 정상 렌더(dev 에서 문서는 200 + 스트리밍 not-found body).

**5. ⚠️ `export const runtime` 은 cacheComponents 와 충돌 (T2.3 실측, 2026-05-21)**
Route Handler(또는 page/layout)에 `export const runtime = "nodejs"` 를 두면 dev/build 가 `Route segment config "runtime" is not compatible with nextConfig.cacheComponents. Please remove it.` 로 즉시 실패(ECMAScript 컴파일 에러 → 그 라우트 전체 500, 404 분기조차 도달 못 함).
- **해결:** `runtime` export 를 **아예 쓰지 않는다.** `runtime` 기본값이 이미 `'nodejs'`(출처: `route-segment-config/runtime.md` "'nodejs' (default)")라 명시 불필요. Edge 는 puppeteer 와 무관하게 cacheComponents 미지원.
- **`maxDuration` 은 OK** — `export const maxDuration = 30` 은 cacheComponents 와 충돌 안 함(v16 에서 제거된 건 `dynamic`/`dynamicParams`/`revalidate`/`fetchCache`, `runtime`·`maxDuration`·`preferredRegion` 은 표에 잔존). 단 `runtime` 만 cacheComponents 가 거부.
- **How to apply:** ROADMAP/인수인계 가이드가 `export const runtime = "nodejs"` 를 지시해도 이 프로젝트(cacheComponents:true)에선 넣지 말 것. T2.4 `/api/revalidate` 등 다른 Route Handler 도 동일.
- 구현 위치: `app/q/[slug]/pdf/route.ts`(주석으로 근거 명시, maxDuration 만 유지).

**6. PDF Route Handler 패턴 (T2.3)**
`app/q/[slug]/pdf/route.ts`: `GET(_req: NextRequest, ctx: { params: Promise<{slug}> })` → `await ctx.params` → `getQuoteBySlug`(server-only lib, 라우트 import OK) null→404 → puppeteer-core launch(`@/lib/pdf-browser` buildLaunchOptions 공유, server-only 미import) → `page.goto(/q/${slug}?print=1, {waitUntil:"networkidle0"})` → `page.pdf({format:"A4",printBackground:true,margin:10mm})` → `finally browser.close()`.
- ⚠️ `?print=1` 는 서버 렌더 분기에 안 씀(셸에서 searchParams 읽으면 게이트#1 깸). UI 크롬 숨김은 **Tailwind `print:hidden`(=@media print)** — puppeteer page.pdf() 가 print 미디어 에뮬레이트하므로 자동 적용. `data-print-hide` 속성은 CSS 없어 무효 → `print:hidden` 클래스로 교체함(Header/Footer/page.tsx 셸 placeholder/quote-view.tsx PDF버튼 2개).
- 실측: print 미디어에서 header/footer/placeholder/PDF버튼 display:none, article block 유지. 생성 PDF 188.5KB·1p·%PDF-1.4·"Pretendard" 흔적. 파일명 `견적서_<clientCompany>_<YYYYMMDD(issuedAt)>.pdf` RFC5987 `filename*=UTF-8''<encodeURIComponent>`. 빌드 `ƒ /q/[slug]/pdf`. proxy.ts `/q/:path*` 가 pdf 응답에도 X-Robots-Tag 적용(추가 작업 불필요).
- `page.pdf()` 반환은 `Uint8Array`(v24) → Response body 로 `pdfBytes.buffer.slice(byteOffset, byteOffset+byteLength)` 정확 구간 복사 전달.

관련: [[notion_slug_formula_filter_trap]] [[w2-pdf-chromium-setup]] [[w2-korean-font-pretendard]]
