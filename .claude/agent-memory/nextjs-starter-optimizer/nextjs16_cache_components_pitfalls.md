---
name: nextjs16-cache-components-pitfalls
description: cacheComponents=true 환경에서 동적 라우트는 Suspense 안에 데이터 페치를 둬야 빌드가 통과한다
metadata:
  type: feedback
---

`next.config.ts` 에 `cacheComponents: true` 가 켜져 있으면 동적 라우트(`[slug]`) 페이지에서 `params` 를 await 한 후 캐시되지 않은 데이터를 접근하면 다음 빌드 에러로 prerender 가 막힌다.

```
Error: Route "/foo/[slug]": Uncached data was accessed outside of <Suspense>.
This delays the entire page from rendering, resulting in a slow user experience.
```

**Why:** Cache Components 는 페이지의 정적 셸을 먼저 prerender 하고 runtime data 를 stream 으로 채우는 PPR(Partial Prerender) 모델이다. `params` 자체가 runtime data 로 취급되므로, 이를 await 하는 코드가 페이지 함수 본체(셸)에 있으면 셸 prerender 가 차단된다.

**How to apply:**
- 동적 라우트는 항상 다음 패턴으로 작성한다:
  ```tsx
  export default function Page({ params }: { params: Promise<{ slug: string }> }) {
    return (
      <Suspense fallback={<Skeleton />}>
        <Content params={params} />
      </Suspense>
    )
  }
  async function Content({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const data = await getCached(slug)
    // ...
  }
  ```
- 페치 함수에는 `"use cache"` + `cacheLife(...)` 를 함수 첫 줄에 둔다. `revalidate` export 는 사용 금지(마이그레이션 문서가 cacheLife 로 대체할 것을 명시).
- `cacheLife` 프리셋: `seconds`/`minutes`/`hours`/`days`/`weeks`/`max`. PRD 의 "ISR 60초" 는 `"minutes"` 로 매핑.
- generateMetadata 도 같은 함수 캐시를 재사용하면 Notion API 호출이 절감된다.
- 실제 적용 예시는 `app/posts/[slug]/page.tsx` (셸 + Suspense + 데이터 컴포넌트 + Skeleton 4단 분리).
- 관련: [[project-identity]]
