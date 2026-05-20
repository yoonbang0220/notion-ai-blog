import { Suspense } from "react"
import type { Metadata } from "next"

import { QuoteData } from "./quote-data"
import { QuoteSkeleton } from "./quote-skeleton"

/**
 * 견적서 열람 페이지(`/q/[slug]`) — 얇은 서버 컴포넌트 셸.
 *
 * 구조: 정적 셸(상단 발행처 placeholder) + `<Suspense>` 안의 데이터 컴포넌트.
 *
 * ⚠️ Next.js 16 Cache Components 규칙: 동적 데이터 페치({@link QuoteData})는 반드시
 *   `<Suspense>` 안에 둬야 빌드가 통과한다. 셸 밖에서 직접 await 하면
 *   `Uncached data was accessed outside of <Suspense>` 빌드 에러가 난다.
 *
 * ⚠️ `params` 자체가 request-time(동적) 값이다(2026-05-20 build 실측). **셸 본문에서
 *   `await params` 하면** params 도 "uncached data outside <Suspense>" 로 취급돼
 *   동일 빌드 에러가 난다. → 셸은 `params` Promise 를 await 하지 않고 그대로
 *   `<Suspense>` 안의 {@link QuoteResolver} 로 넘긴다. params await 는 Suspense
 *   경계 **안**(QuoteResolver)에서 수행하고, 풀린 plain `slug`(string) 만
 *   `"use cache"` 컴포넌트({@link QuoteData})의 캐시 키로 전달한다.
 *   (`generateMetadata` 의 `await params` 는 별도 평가 경로라 허용된다.)
 *
 * noindex(정합성 규칙 5)는 2중 안전망으로 강제한다:
 *   1) 응답 헤더 `X-Robots-Tag: noindex, nofollow, noarchive` — `proxy.ts`
 *   2) HTML `<meta name="robots">` — 아래 {@link generateMetadata}
 */

type QuotePageProps = {
  params: Promise<{ slug: string }>
}

/**
 * Suspense 경계 **안**에서 `params` 를 await 하는 중간 컴포넌트(캐시 대상 아님).
 *
 * 셸이 params 를 직접 await 하면 정적 prerender 가 막히므로, params 해석을 이 경계
 * 안으로 미룬다. 풀린 slug 문자열만 `"use cache"` 컴포넌트로 전달한다.
 */
async function QuoteResolver({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <QuoteData slug={slug} />
}

export async function generateMetadata({
  params,
}: QuotePageProps): Promise<Metadata> {
  // slug 는 메타데이터에 노출하지 않는다(추측 불가 URL 유지). 제목만 고정.
  await params
  return {
    title: "견적서",
    // 정합성 규칙 5 — 검색엔진 인덱싱 차단(헤더와 별개의 이중 안전망).
    robots: { index: false, follow: false },
  }
}

export default function QuotePage({ params }: QuotePageProps) {
  // ⚠️ 셸에서는 params 를 await 하지 않는다(정적 prerender 보존). Promise 를 그대로
  //    Suspense 안의 QuoteResolver 로 넘겨 거기서 await 한다.
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* 정적 셸 — 발행처 영역(placeholder). T1.6 에서 정식 디자인으로 교체. */}
      <div className="mb-6 border-b pb-4">
        <p className="text-muted-foreground text-sm">견적서</p>
      </div>

      {/* 동적 데이터는 반드시 Suspense 안에서 streaming(Cache Components 규칙). */}
      <Suspense fallback={<QuoteSkeleton />}>
        <QuoteResolver params={params} />
      </Suspense>
    </main>
  )
}
