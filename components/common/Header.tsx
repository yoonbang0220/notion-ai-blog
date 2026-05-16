import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

const navItems = [
  { href: "/", label: "홈" },
  { href: "/posts", label: "글 목록" },
  { href: "/about", label: "소개" },
]

export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
        <Link
          href="/"
          className="mr-8 flex items-center text-xl font-bold tracking-tight"
        >
          AI 학습 블로그
        </Link>
        <nav className="flex flex-1 items-center gap-6 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-foreground/60 hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
