import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© 2026 StarterKit. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            개인정보처리방침
          </Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">
            문의하기
          </Link>
        </div>
      </div>
    </footer>
  )
}
