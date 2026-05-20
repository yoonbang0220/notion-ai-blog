import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
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
