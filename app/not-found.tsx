import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] gap-6 text-center px-4">
      <p className="text-8xl font-bold text-muted-foreground/30">404</p>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">페이지를 찾을 수 없어요</h1>
        <p className="text-muted-foreground max-w-md">
          요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있습니다.
          URL을 다시 확인해 보세요.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        홈으로 돌아가기
      </Link>
    </div>
  )
}
