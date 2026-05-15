# CLAUDE.md

이 저장소에서 Claude Code(claude.ai/code)가 작업할 때 따라야 할 지침이다.

@AGENTS.md

## 언어 규칙

- **응답·주석·커밋 메시지·문서**: 한국어
- **변수명·함수명**: 영어 (코드 표준 준수)

## 명령어

```bash
npm run dev      # 개발 서버 (Next.js 16 / Turbopack 기본)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # ESLint (package.json은 `eslint`만 — 인자 없이 전체 검사)
npx prettier --write .            # 전체 포맷팅 (`format` npm 스크립트 없음 → npx 직접 호출)
npx shadcn@latest add <component> # shadcn/ui 컴포넌트 추가
```

테스트 러너·pre-commit hook 모두 미설정.

## 기술 스택 & ⚠️ 함정 노트

- **Next.js 16.2.4** (App Router)
  - `params` / `searchParams`는 **`Promise` 타입** → 반드시 `await`.
  - `next.config.ts`에서 `cacheComponents: true` 활성화 → 서버 컴포넌트 내 비동기 함수에 `"use cache"` 지시자 사용 가능.
  - `middleware.ts`는 지원되나 향후 `proxy.ts`로 마이그레이션될 수 있음.
- **React 19.2.4**
- **TypeScript 5** (`strict: true`)
- **Tailwind CSS v4** — `tailwind.config.ts` 없음. 토큰은 `app/globals.css`의 `@theme inline` 블록에서 정의. `@import "shadcn/tailwind.css"` 포함.
- **shadcn/ui (`base-nova` 스타일)** — ⚠️ **Radix UI가 아닌 `@base-ui/react` 기반.** 컴포넌트 API가 기존 shadcn과 다르므로 props는 항상 실제 파일에서 확인. 폼 빌딩은 `field.tsx`(Field/FieldLabel/FieldGroup 등) + `separator.tsx` 조합을 사용한다.
- **next-themes** — `ThemeProvider`, 루트 `<html>`에 `suppressHydrationWarning` 필수.
- **sonner** — `<Toaster>`는 루트 레이아웃(`app/layout.tsx`)에 이미 포함됨. 페이지별 재선언 금지.
- **lucide-react** — 아이콘.

## 아키텍처

```
app/                # 페이지·레이아웃 (App Router)
components/
  ui/               # shadcn/ui 컴포넌트 (직접 수정 최소화)
                    #   현재: button, card, dialog, dropdown-menu, field,
                    #         input, label, separator, sonner
  common/           # 프로젝트 공통 (Header, Footer, ThemeProvider, ThemeToggle, NavItem)
  login-form.tsx    # 페이지 폼은 components/ 루트에 분리 (common/ui 아님)
hooks/              # 커스텀 훅 (use-media-query 등)
lib/utils.ts        # cn() — clsx + tailwind-merge
types/index.ts      # 공통 타입 (User, ApiResponse, PaginatedResponse, ThemeMode)
roots/              # ⚠️ Hook 동작 검증용 임시 파일 보관 — 프로젝트 코드 아님
```

> **폼 컴포넌트 분리 패턴** — `app/login/page.tsx`는 얇은 래퍼이고 실제 폼은 `components/login-form.tsx`. 새 폼(signup 등) 추가 시 동일하게 `components/<feature>-form.tsx`로 분리한다.

**레이아웃 계층**
```
RootLayout (ThemeProvider · Header · main · Footer · Toaster)
  └── DashboardLayout (사이드바 + 콘텐츠)  ← /dashboard 하위에만 중첩
```

대시보드는 루트 레이아웃 안에 중첩된다. Header/Footer는 유지되고 사이드바·콘텐츠 영역만 추가된다.

**페이지 현황**: 구현 — `/`, `/login`, `/signup`, `/dashboard`, `not-found`. 사이드바(`app/dashboard/layout.tsx`)에 링크만 정의된 미구현 라우트(`analytics`, `users`, `posts`, `settings`)가 있다.

## 주요 패턴

- **컴포넌트 변형** — `class-variance-authority`(CVA)로 `variant`/`size`. `components/ui/button.tsx`가 레퍼런스. `@base-ui/react` primitive를 감싸며 `ButtonPrimitive.Props`를 확장한다.
- **사이드바 활성 상태** — `components/common/NavItem.tsx`가 `usePathname()`으로 현재 경로 감지해 자동 스타일링. 신규 사이드바 항목은 이 컴포넌트 재사용.
- **className 병합** — 무조건 `cn()`. Tailwind 충돌 해결.
- **클라이언트 컴포넌트** — 브라우저 API·훅이 필요할 때만 `"use client"`.

## 스타일링

- 색상 토큰: `app/globals.css`의 CSS 변수(`--background`, `--primary` 등). **oklch** 색공간.
- 다크모드: `.dark` 클래스 토글 — `@custom-variant dark (&:is(.dark *))`.
- 테마 색 변경 → `globals.css`의 `:root` / `.dark` 블록.
- 클래스 정렬: `prettier-plugin-tailwindcss` 자동.

## 환경 변수 & 경로

- `.env.local`에 실제 값 (`.env.example` 참고). 클라이언트 노출 변수는 `NEXT_PUBLIC_` 접두사 필수.
- 경로 alias: `@/*` → 프로젝트 루트 (`tsconfig.json`).

## 프로젝트 컨텍스트 문서

- `PRODUCT_SPEC.md` — 제품 사양서. 기능·요구사항 추적의 단일 출처. 새 기능 추가 시 먼저 참고.
- `BUG_REPORT.md` — 알려진 버그·이슈 누적 기록.
- `README.md` — 외부 독자용 스타터킷 소개.

## Claude Code 통합 환경

저장소 동봉 자산:

- `.claude/agents/` — 서브에이전트 정의 (`code-reviewer-kr`, `qa-engineer`, `reverse-planner`).
- `.claude/agent-memory/<agent>/` — 서브에이전트별 메모리 저장소.
- `.claude/commands/git/` — 커스텀 슬래시 명령 (`/git:commit`, `/git:explain`).
- `.claude/output-styles/beginner.md` — 초보자용 출력 스타일.
- `.claude/settings.json` — 프로젝트 공유 Hook 설정 (현재 Bash PreToolUse 테스트 훅 → `hook-test.txt`에 로그 append).
- `.claude/slack-notify.ps1` — Windows PowerShell. 권한 요청 / 작업 완료 / 서브에이전트 이벤트를 Slack에 전달. UTF-8 BOM 인코딩 사용(한글 깨짐 방지).
- `.claude/statusline-command.sh` / `.claude/statusline-command.ps1` — 크로스플랫폼 statusline 스크립트(macOS·Linux / Windows). 대화 컨텍스트 기반으로 하단 상태바를 그린다. **statusline 동작 수정 시 두 파일을 동시에 맞춰야 함**.
- `.mcp.json` — MCP 서버 설정. `context7`(라이브러리 문서 조회), `sequential-thinking`(단계적 사고) 등록.
- `docs/HOOKS_PLANNING.md` — Slack 알림 시스템 설계·이슈·로드맵 기획서. **Slack/Hook 관련 변경 시 반드시 참조**.
- `hook-test.txt` (저장소 루트) — Bash PreToolUse 훅이 append하는 로그. 수동 편집 금지.

`.claude/settings.local.json`은 `.gitignore` 처리. Claude Code가 자동 추가하는 permission 룰에 webhook URL 같은 민감값이 섞일 수 있어 의도적으로 untrack.
