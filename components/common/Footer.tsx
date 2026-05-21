export function Footer() {
  // print:hidden — PDF 인쇄 시 전역 푸터 제외(T2.3).
  return (
    <footer className="mt-auto border-t py-8 print:hidden">
      <div className="text-muted-foreground mx-auto max-w-7xl px-4 text-center text-sm">
        © 2026 Quote Viewer.
      </div>
    </footer>
  )
}
