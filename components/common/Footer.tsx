import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto border-t py-8">
      <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm md:flex-row">
        <p>© 2026 AI 학습 블로그. 초보를 위한 학습 노트입니다.</p>
        <div className="flex gap-6">
          <Link href="/posts" className="hover:text-foreground transition-colors">
            글 목록
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            소개
          </Link>
        </div>
      </div>
    </footer>
  )
}
