"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"

/**
 * 전역 에러 경계(T2.7) — App Router 의 라우트 세그먼트 에러를 graceful 하게 처리한다.
 *
 * 트리거 맥락:
 *   - `getQuoteBySlug` 가 중복 slug 를 받으면 `throw new Error("Duplicate slug: ...")`(정합성 규칙 1)
 *     → 견적 페이지 렌더가 이 경계로 떨어진다.
 *   - Notion API 실패·예기치 못한 런타임 예외도 흰 화면/스택트레이스가 아니라 한국어 안내로 표시.
 *
 * ⚠️ error boundary 는 반드시 Client Component(`"use client"`) 여야 한다(Next.js 규칙).
 * ⚠️ `error.message` 를 화면에 그대로 노출하지 않는다(C2 원칙 — Notion ID·내부 경로 등이
 *    스택트레이스/메시지로 새어나갈 수 있음). 개발 디버깅은 `console.error` 로만 남긴다.
 *
 * props:
 *   - error: 발생한 에러(서버 측에서 자동 부여되는 `digest` 포함 가능).
 *   - reset: 동일 세그먼트를 다시 렌더 시도하는 콜백("다시 시도").
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // 원본 에러는 서버/브라우저 콘솔에만 기록(화면 비노출).
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">문제가 발생했어요</h1>
        <p className="text-muted-foreground max-w-md">
          페이지를 불러오는 중 일시적인 오류가 생겼어요. 잠시 후 다시
          시도해 주세요. 문제가 계속되면 잠시 뒤 다시 방문해 주세요.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>다시 시도</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          홈으로
        </Link>
      </div>
    </div>
  )
}
