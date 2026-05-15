import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center font-bold text-xl mr-8">
          StarterKit
        </Link>
        <nav className="flex flex-1 items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            홈
          </Link>
          <Link
            href="/dashboard"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            대시보드
          </Link>
          <Link
            href="/login"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            로그인
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
