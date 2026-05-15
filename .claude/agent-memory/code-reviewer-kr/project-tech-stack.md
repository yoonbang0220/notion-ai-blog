---
name: project-tech-stack
description: 이 프로젝트의 기술 스택 및 핵심 설정 정보
metadata:
  type: project
---

Next.js 16.2.4 + React 19.2.4 + TypeScript + Tailwind CSS v4 + shadcn/ui(base-nova 스타일, @base-ui/react 기반) 스타터킷.

**Why:** Radix UI 기반 표준 shadcn/ui가 아닌 @base-ui/react 헤드리스 프리미티브를 사용하는 base-nova 스타일이므로, Dialog/DropdownMenu 등 컴포넌트의 API가 표준 shadcn/ui와 다름.

**How to apply:** UI 컴포넌트 리뷰 시 Radix UI 기준이 아닌 @base-ui/react API 기준으로 판단해야 함.

핵심 설정:
- `tailwind.config.ts` 없음 — `app/globals.css`의 `@theme inline` 블록에서 토큰 정의
- 색상: oklch 색상 공간 사용 (`--background`, `--primary` 등 CSS 변수)
- 다크모드: `@custom-variant dark (&:is(.dark *))` + next-themes `.dark` 클래스
- `cacheComponents: true` (next.config.ts) — "use cache" 지시자 활성화
- `tsconfig.json` strict: true, paths: `@/*` → 프로젝트 루트
- params/searchParams는 Next.js 16에서 Promise 타입 — await 필수

의존성 버전:
- @base-ui/react: ^1.4.1
- next-themes: ^0.4.6
- sonner: ^2.0.7
- lucide-react: ^1.14.0
- class-variance-authority: ^0.7.1
