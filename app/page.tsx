import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Zap, Shield, Palette } from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: Zap,
    title: "빠른 개발",
    description:
      "Next.js 16 Turbopack과 shadcn/ui 컴포넌트로 빠르게 개발하세요. 반복 작업 없이 핵심 기능에 집중하세요.",
  },
  {
    icon: Shield,
    title: "TypeScript",
    description:
      "완전한 TypeScript 지원으로 타입 안전성을 보장합니다. 개발 중 오류를 빠르게 잡아냅니다.",
  },
  {
    icon: Palette,
    title: "다크모드",
    description:
      "next-themes를 활용한 완벽한 다크모드 지원. 시스템 설정에 자동으로 맞춰집니다.",
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero 섹션 */}
      <section className="flex flex-col items-center justify-center gap-8 py-28 px-4 text-center bg-gradient-to-b from-background to-muted/30">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Next.js 스타터킷
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Next.js 16 + shadcn/ui + Tailwind CSS v4로 만든 재사용 가능한 개발 스타터킷.
            <br />
            빠르게 시작하고 비즈니스 로직에만 집중하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {/* base-ui 기반 shadcn 버전에서는 buttonVariants를 Link에 직접 적용 */}
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            대시보드 보기
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            로그인
          </Link>
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground flex-wrap justify-center">
          <span className="bg-muted px-3 py-1 rounded-full">Next.js 16.2.4</span>
          <span className="bg-muted px-3 py-1 rounded-full">React 19.2.4</span>
          <span className="bg-muted px-3 py-1 rounded-full">Tailwind v4</span>
          <span className="bg-muted px-3 py-1 rounded-full">shadcn/ui</span>
          <span className="bg-muted px-3 py-1 rounded-full">TypeScript</span>
        </div>
      </section>

      {/* 기능 카드 섹션 */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">포함된 기능들 모아보기</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
