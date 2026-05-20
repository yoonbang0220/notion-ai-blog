import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-muted-foreground/30 text-8xl font-bold">404</p>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">페이지를 찾을 수 없어요</h1>
        <p className="text-muted-foreground max-w-md">
          요청하신 주소가 잘못되었거나, 견적서가 비공개되었을 수 있어요.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        홈으로
      </Link>
    </div>
  )
}
