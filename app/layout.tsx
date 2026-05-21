import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import localFont from "next/font/local"
import "./globals.css"
import { ThemeProvider } from "@/components/common/ThemeProvider"
import { Header } from "@/components/common/Header"
import { Footer } from "@/components/common/Footer"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// 한글 본문 폰트(Pretendard 변수 폰트, OFL 라이선스 — 상업 사용 가능).
// 변수 폰트 1개로 weight 45~920 범위를 모두 커버한다.
// ⚠️ T2.7 서브셋 적용: 원본 2MB → KS X 1001 상용 한글 2350자 + ASCII + 기호로 452KB(77.5%↓).
//    서브셋 스크립트: scripts/subset-font.ts. variationAxes 미지정으로 weight 변수축 유지.
//    비상용 음절(회사명 고유명사 등)은 폴백 폰트로 렌더될 수 있음(누락 시 음절 전체로 회귀).
// display:"block" — PDF 헤드리스 인쇄(T2.3) 시 폴백 폰트로 캡처돼 한글이 깨지는 것을
// 막기 위함. block 은 짧은 차단 기간 동안 텍스트를 숨겼다가 폰트 로드 후 표시하므로,
// PDF 라우트의 networkidle0 대기와 결합하면 Pretendard 적용이 보장된다.
const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.subset.woff2",
  variable: "--font-pretendard",
  display: "block",
  weight: "45 920",
})

export const metadata: Metadata = {
  title: {
    default: "Quote Viewer",
    template: "%s | Quote Viewer",
  },
  description: "Notion 기반 견적서 웹뷰어 + PDF 다운로드.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
