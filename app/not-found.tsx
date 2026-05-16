import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-muted-foreground/30 text-8xl font-bold">404</p>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">글을 찾을 수 없어요</h1>
        <p className="text-muted-foreground max-w-md">
          요청하신 페이지가 삭제되었거나 주소가 바뀌었을 수 있어요. 전체 글 목록에서 다시
          찾아보세요.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className={buttonVariants()}>
          홈으로
        </Link>
        <Link href="/posts" className={buttonVariants({ variant: "outline" })}>
          글 목록 보기
        </Link>
      </div>
    </div>
  )
}
