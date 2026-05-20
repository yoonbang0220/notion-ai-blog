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

관련: [[notion_slug_formula_filter_trap]]
