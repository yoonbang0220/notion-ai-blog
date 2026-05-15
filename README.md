# Next.js 스타터킷

Next.js 16 + shadcn/ui + Tailwind CSS v4 기반의 웹 개발 스타터킷입니다.
새 프로젝트를 시작할 때 바로 복사해서 사용할 수 있습니다.

## 기술 스택

| 패키지 | 버전 | 설명 |
|--------|------|------|
| Next.js | 16.2.4 | App Router, Turbopack 기본 |
| React | 19.2.4 | React 19 |
| TypeScript | ^5 | 타입 안전성 |
| Tailwind CSS | ^4 | CSS 유틸리티 프레임워크 (v4) |
| shadcn/ui | 4.6.0 | UI 컴포넌트 라이브러리 |
| next-themes | ^0.4.6 | 다크모드 지원 |
| lucide-react | ^1.14.0 | 아이콘 라이브러리 |
| sonner | ^2.0.7 | Toast 알림 |
| class-variance-authority | ^0.7.1 | 컴포넌트 변형 관리 |
| tailwind-merge | ^3.5.0 | Tailwind 클래스 병합 |
| ESLint | ^9 | 코드 린팅 |

## 설치 및 실행

```bash
# 1. 저장소 클론 또는 복사

# 2. 패키지 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에서 값 수정

# 4. 개발 서버 실행 (Turbopack)
npm run dev

# 5. 빌드
npm run build

# 6. 프로덕션 실행
npm start
```

브라우저에서 http://localhost:3000 으로 접속하세요.

## 폴더 구조

```
yoonbang_starter_kit/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # 루트 레이아웃 (Header/Footer/ThemeProvider)
│   ├── page.tsx              # 메인 랜딩 페이지
│   ├── not-found.tsx         # 404 페이지
│   ├── login/
│   │   └── page.tsx          # 로그인 페이지
│   ├── signup/
│   │   └── page.tsx          # 회원가입 페이지
│   └── dashboard/
│       ├── layout.tsx        # 대시보드 레이아웃 (사이드바)
│       └── page.tsx          # 대시보드 메인
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트 (자동 생성)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── sonner.tsx
│   └── common/               # 공통 커스텀 컴포넌트
│       ├── Header.tsx        # 헤더 (네비게이션 + 다크모드 토글)
│       ├── Footer.tsx        # 푸터
│       ├── ThemeProvider.tsx # next-themes 래퍼
│       └── ThemeToggle.tsx   # 다크모드 토글 버튼
├── hooks/
│   └── use-media-query.ts    # 미디어 쿼리 커스텀 훅
├── lib/
│   └── utils.ts              # cn() 유틸 함수 (shadcn 제공)
├── types/
│   └── index.ts              # 공통 타입 정의
├── public/                   # 정적 파일
├── .env.example              # 환경 변수 예시
├── components.json           # shadcn/ui 설정
├── next.config.ts            # Next.js 설정
├── tailwind.config.ts        # (v4는 CSS 파일에서 설정)
└── tsconfig.json             # TypeScript 설정
```

## 포함된 기능

### 페이지
- **`/`** - 랜딩 페이지 (Hero 섹션 + 기능 소개 카드 3개)
- **`/login`** - 로그인 폼 (UI)
- **`/signup`** - 회원가입 폼 (UI)
- **`/dashboard`** - 사이드바 + 통계 카드 + 활동 내역 대시보드
- **`/404`** - 커스텀 404 페이지

### 기능
- 다크모드 토글 (시스템 설정 자동 감지)
- 공통 Header (로고, 네비게이션, 다크모드 버튼)
- 공통 Footer
- Sonner Toast 전역 설정
- `useMediaQuery` 커스텀 훅
- 공통 TypeScript 타입 (`User`, `ApiResponse`, `PaginatedResponse`)

### shadcn/ui 컴포넌트
Button, Input, Card, Label, Dialog, DropdownMenu, Sonner(toast)

## 커스터마이징 가이드

### shadcn/ui 컴포넌트 추가

```bash
# 컴포넌트 목록 확인: https://ui.shadcn.com/docs/components
npx shadcn@latest add [컴포넌트명]

# 예시
npx shadcn@latest add table
npx shadcn@latest add form
npx shadcn@latest add select
npx shadcn@latest add tabs
npx shadcn@latest add avatar
```

### 테마 색상 변경

`app/globals.css`의 CSS 변수를 수정하세요:

```css
:root {
  --primary: oklch(0.205 0 0);    /* 주요 색상 */
  --secondary: oklch(0.97 0 0);   /* 보조 색상 */
  --radius: 0.625rem;              /* 모서리 둥글기 */
}
```

shadcn/ui 테마 생성기를 활용하세요: https://ui.shadcn.com/themes

### 새 페이지 추가

```
app/
└── my-page/
    └── page.tsx   # /my-page 경로로 접근
```

### 환경 변수 추가

1. `.env.example`에 예시 추가
2. `.env.local`에 실제 값 설정
3. 클라이언트에서 사용할 변수는 `NEXT_PUBLIC_` 접두사 필요

## Next.js 16 주요 특징

### Turbopack (기본 번들러)
```bash
npm run dev  # Turbopack으로 자동 실행 (별도 설정 불필요)
```

### `"use cache"` 지시자
```tsx
async function fetchData() {
  "use cache"
  // 이 함수 결과는 자동으로 캐시됩니다
  const data = await fetch("https://api.example.com/data")
  return data.json()
}
```

### 비동기 Request API
```tsx
// Next.js 16에서는 params, searchParams가 비동기
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <div>{id}</div>
}
```

### proxy.ts (구 middleware.ts)
Next.js 16에서는 미들웨어가 `proxy.ts`로 마이그레이션될 수 있습니다.
현재 `middleware.ts`도 여전히 지원되며, 공식 마이그레이션 가이드를 확인하세요.

## 라이선스

MIT
