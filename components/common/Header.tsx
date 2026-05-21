import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

export function Header() {
  // print:hidden — PDF 인쇄 시 전역 헤더 제외(T2.3: page.pdf() 가 print 미디어 에뮬레이트).
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
        <Link
          href="/"
          className="mr-8 flex items-center text-xl font-bold tracking-tight"
        >
          Quote Viewer
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
      </div>
    </header>
  )
}
