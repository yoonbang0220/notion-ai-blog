"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/**
 * 공유 링크 복사 버튼(클라이언트 컴포넌트, T3.4).
 *
 * 클릭 시 `${origin}/q/${slug}` 를 클립보드에 기록하고 sonner 토스트로 결과를 알린다.
 * - origin = `window.location.origin` — 운영자가 보고 있는 실제 도메인을 그대로 사용한다
 *   (배포 도메인·커스텀 도메인 자동 대응, 환경변수 미설정 footgun 회피). 고정 정규 URL 이
 *   필요하면 추후 `NEXT_PUBLIC_APP_URL` 로 교체 가능(운영자 결정 ③).
 * - ⚠️ `navigator.clipboard` 는 보안 컨텍스트(HTTPS/localhost)에서만 동작 → 실패 시
 *   fallback 토스트로 안내(권한 거부·비보안 컨텍스트 대비, R14). 앱 크래시 0.
 *
 * sonner `<Toaster>` 는 루트 레이아웃(`app/layout.tsx`)에 이미 마운트됨 → 재선언 금지.
 * slug 형식 위반/누락 행은 이 버튼을 렌더하지 않는다(호출부에서 비활성 처리, 잘못된 URL 방지).
 *
 * @param slug 견적 slug(non-null — 호출부가 보장).
 * @param quoteLabel 행 식별용 라벨(견적 제목 등). 스크린리더 컨텍스트 구분용 aria-label 에 사용.
 */
export function CopyLinkButton({
  slug,
  quoteLabel,
}: {
  slug: string
  quoteLabel?: string
}) {
  async function handleCopy() {
    const url = `${window.location.origin}/q/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("링크를 복사했습니다")
    } catch {
      // 권한 거부·비보안 컨텍스트 등 — 수동 복사할 수 있도록 주소를 함께 안내.
      toast.error("복사에 실패했습니다", { description: url })
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label={quoteLabel ? `${quoteLabel} 링크 복사` : undefined}
    >
      <Copy aria-hidden="true" />
      복사
    </Button>
  )
}
