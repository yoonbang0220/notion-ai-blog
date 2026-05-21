---
name: nextjs16-revalidatetag-two-arg
description: Next.js 16.2.6 에서 revalidateTag 단일 인자 deprecated, webhook 은 {expire:0} 2인자 필요
metadata:
  type: project
---

Next.js 16.2.6 의 `revalidateTag(tag)` **단일 인자 형식은 deprecated** 다 — 두 번째 인자로 profile 을 줘야 한다.

- import 경로: `next/cache` (stable, `unstable_` 아님). `cacheTag`/`cacheLife` 와 동일 모듈.
- 시그니처: `revalidateTag(tag: string, profile: string | { expire?: number }): void`
- webhook/외부 시스템(Make·Zapier)이 **즉시 만료**를 요구하면 `revalidateTag(tag, { expire: 0 })` 를 쓴다 — 공식 문서 권장 패턴.
  출처: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md` 의 "for webhooks or third-party services that need immediate expiration" 절.
- `"max"` profile 은 stale-while-revalidate(다음 방문 시 백그라운드 갱신) — 일반 케이스용. 우리 견적 webhook 은 즉시 만료가 의도라 `{ expire: 0 }` 채택.

**Why:** 단일 인자로 두면 TS 에러 억제 시 동작은 하나 향후 제거 예정 경고가 뜬다. 외부 자동화가 호출하는 즉시 무효화 의미를 정확히 표현하려면 `{ expire: 0 }` 가 맞다.

**How to apply:** `app/api/revalidate/route.ts` 가 `revalidateTag(`quote:${slug}`, { expire: 0 })` 로 구현돼 있다. 캐시 태그 부여는 `app/q/[slug]/quote-data.tsx::QuoteData` 의 `cacheTag(`quote:${slug}`)`. 무효화 태그는 반드시 부여 태그와 동일 규칙(`quote:${slug}`)이어야 한다.

관련: [[nextjs16_cache_components_params_gate]]
