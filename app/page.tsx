import { FileText, Link2, PenLine } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * 랜딩 페이지 (`/`) — 운영자용 정적 소개.
 *
 * PRD IA: "랜딩 (운영자용 소개. MVP에서는 정적 1페이지로 충분)".
 * 운영자는 Notion 에서만 작업하고, 클라이언트는 직접 `/q/[slug]` 링크로 들어온다.
 * → 견적 목록·검색·로그인·대시보드는 범위 밖(Future / 만들지 않는다).
 *
 * ⚠️ 정적 페이지 — Notion 페치 없음 → `"use cache"`/`<Suspense>` 불필요.
 *    빌드 라우트 출력에서 `/` 가 `○ (Static)` 으로 유지돼야 한다.
 * ⚠️ 색 하드코딩 금지 — globals.css oklch 토큰 유틸만 사용(다크모드 자동 대응).
 * ⚠️ 한글 폰트(Pretendard)는 T2.2 담당 — 기본 font-sans(Geist) 그대로.
 * ⚠️ Header(브랜드명)·Footer 는 루트 레이아웃(app/layout.tsx)에 이미 있으므로
 *    이 페이지에서 중복 선언하지 않는다.
 */

const steps = [
  {
    icon: PenLine,
    title: "Notion 에 견적 작성",
    description:
      "Invoice · Items 데이터베이스에 견적 메타와 항목을 입력합니다. 합계는 자동으로 계산됩니다.",
  },
  {
    icon: FileText,
    title: "상태를 발행으로",
    description:
      "견적의 상태를 발행으로 바꾸면 공유용 링크가 생성됩니다. 초안·보관 상태는 노출되지 않습니다.",
  },
  {
    icon: Link2,
    title: "링크를 클라이언트에게",
    description:
      "생성된 링크를 카톡·메일로 보냅니다. 클라이언트는 가입 없이 열람하고 PDF 로 내려받습니다.",
  },
] as const

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      {/* 히어로 — 서비스명 + 한 줄 가치 제안 */}
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-wide">
          Quote Viewer · 견적서 뷰어
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          Notion 으로 쓰고, 링크로 공유하고, PDF 로 결재.
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed text-pretty sm:text-lg">
          별도 도구 없이 Notion 에서 작성한 견적을 링크 하나로 공유하세요.
          클라이언트는 회원가입 없이 PC·모바일 어디서든 견적서를 열람하고
          결재용 PDF 를 한 번에 내려받습니다.
        </p>
      </section>

      {/* 운영자용 3스텝 안내 */}
      <section className="mt-16 sm:mt-20" aria-labelledby="how-it-works">
        <h2
          id="how-it-works"
          className="text-muted-foreground mb-6 text-center text-sm font-medium tracking-wide"
        >
          운영자 사용 흐름 — 모든 작업은 Notion 에서
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.title}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="bg-muted text-foreground flex size-9 items-center justify-center rounded-lg">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="mt-2 flex items-baseline gap-2 text-base">
                      <span className="text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
