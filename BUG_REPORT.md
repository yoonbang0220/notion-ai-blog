# 버그 리포트

**프로젝트**: nextjs-shadcn-starter  
**검수일**: 2026-05-14  
**검수자**: QA 엔지니어 (Claude Sonnet 4.6)  
**검수 범위**: 전체 소스 코드 정적 분석

---

## 요약

| 심각도 | 건수 |
|--------|------|
| Critical | 1 |
| High | 4 |
| Medium | 5 |
| Low | 4 |
| **합계** | **14** |

### 주요 발견 사항
- 로그인/회원가입 폼에 서버 액션(Server Action) 또는 핸들러가 전혀 없어 제출 시 아무 동작도 하지 않음 (Critical)
- `ThemeToggle`이 마운트 전(SSR 시) `resolvedTheme`이 `undefined`여서 클릭 시 테마가 `dark`로 고정될 위험 존재 (High)
- Footer 링크 3개(`/terms`, `/privacy`, `/contact`)와 로그인 페이지의 `/forgot-password`, 대시보드 사이드바 4개 하위 경로가 404를 반환하는 미구현 경로임 (High)
- `button.tsx`의 default variant CSS 셀렉터 `[a]:hover:bg-primary/80`가 Tailwind v4 arbitrary variant 문법으로 잘못 작성되어 Link 버튼에 호버 스타일이 적용되지 않음 (High)
- `DashboardLayout`이 서버 컴포넌트임에도 `NavItem`을 직접 렌더링하는데, `NavItem`이 `"use client"`이므로 구조는 문제없으나 레이아웃 내 모바일 사이드바 처리가 전혀 없어 소형 화면에서 사이드바가 콘텐츠를 가림 (Medium)

---

## 발견된 버그 목록

---

### [Critical] 로그인/회원가입 폼에 제출 핸들러 없음

- **파일**: `app/login/page.tsx`, `app/signup/page.tsx`
- **위치**: `<form>` 태그 (login: 27번째 줄, signup: 27번째 줄)
- **설명**: 두 폼 모두 `action` 속성, `onSubmit` 핸들러, Server Action 연결이 전혀 없다. 사용자가 버튼을 클릭하거나 Enter 키를 누르면 브라우저 기본 동작(페이지 새로고침)만 발생하며 인증 로직이 실행되지 않는다. 또한 입력 필드에 `required`, `minLength` 등 HTML 유효성 검사 속성도 없어 빈 값으로도 제출이 가능하다.
- **재현 방법**:
  1. `/login` 또는 `/signup` 페이지 접속
  2. 이메일/비밀번호 입력 후 로그인(또는 회원가입) 버튼 클릭
- **예상 결과**: 인증 API 또는 Server Action 호출 후 결과에 따른 피드백(성공 시 리다이렉트 / 실패 시 에러 메시지)
- **실제 결과**: 페이지가 새로고침되고 아무 동작도 발생하지 않음
- **수정 방안**:
  - Server Action을 별도 파일(`app/actions/auth.ts`)에 `"use server"` 지시자와 함께 작성하고 `<form action={loginAction}>`으로 연결하거나
  - 폼을 `"use client"` 컴포넌트로 분리하고 `onSubmit` 핸들러에 API 호출 로직 추가
  - 입력 필드에 `required`, `type="email"`, `minLength={8}` 등 기본 유효성 검사 속성 추가

---

### [High] ThemeToggle 초기 클릭 시 테마가 `dark`로 고정되는 버그

- **파일**: `components/common/ThemeToggle.tsx`
- **위치**: 14번째 줄 `onClick` 핸들러
- **설명**: `useTheme()`의 `resolvedTheme`은 클라이언트 하이드레이션 전(또는 테마가 아직 감지되지 않은 순간)에 `undefined`를 반환할 수 있다. 현재 코드 `resolvedTheme === "light" ? "dark" : "light"`는 `resolvedTheme`이 `undefined`일 때 `"light"`가 아니므로 항상 `"light"`를 반환하여 테마를 `light`로 설정한다. 반대로 시스템 테마가 `dark`인 상태에서 페이지 로드 직후 버튼을 클릭하면 `resolvedTheme`이 아직 `"dark"`로 반영되지 않았을 경우 의도치 않게 `light`로 전환된다. 또한 `mounted` 상태 없이 렌더링되므로 서버-클라이언트 간 아이콘 표시가 초기에 불일치할 수 있다.
- **재현 방법**:
  1. 시스템 테마를 `dark`로 설정
  2. 앱을 로드한 직후(하이드레이션 완료 전) ThemeToggle 버튼을 빠르게 클릭
- **예상 결과**: 다크 → 라이트 테마 전환
- **실제 결과**: 경쟁 조건(race condition)에 따라 예상과 다른 방향으로 전환될 수 있음
- **수정 방안**:
  ```tsx
  // mounted 상태를 추가하여 하이드레이션 전에는 버튼 비활성화 또는 로딩 UI 표시
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  
  if (!mounted) return <div className="size-8" /> // 레이아웃 유지를 위한 placeholder
  
  // 핸들러: undefined 방어
  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
  ```

---

### [High] 대시보드 사이드바 하위 경로 4개 및 Footer/로그인 페이지 링크가 404 반환

- **파일**: `app/dashboard/layout.tsx` (4~10번째 줄), `components/common/Footer.tsx` (9~16번째 줄), `app/login/page.tsx` (42번째 줄)
- **위치**: `sidebarItems` 배열, Footer 링크, 비밀번호 찾기 링크
- **설명**: 아래 경로들이 라우트 파일(`page.tsx`) 없이 링크만 존재한다.
  - `/dashboard/analytics` — 대시보드 사이드바
  - `/dashboard/users` — 대시보드 사이드바
  - `/dashboard/posts` — 대시보드 사이드바
  - `/dashboard/settings` — 대시보드 사이드바
  - `/terms` — Footer
  - `/privacy` — Footer
  - `/contact` — Footer
  - `/forgot-password` — 로그인 페이지
- **재현 방법**: 각 링크 클릭
- **예상 결과**: 해당 페이지 콘텐츠 표시
- **실제 결과**: Next.js 기본 404 페이지(`app/not-found.tsx`) 렌더링
- **수정 방안**:
  - 단기: 미구현 링크에 `onClick={(e) => e.preventDefault()}` 또는 `aria-disabled` 처리 + 시각적 비활성화 표시
  - 장기: 각 경로에 해당하는 `page.tsx` 파일 생성

---

### [High] Button default variant의 Link 호버 CSS 셀렉터가 잘못됨

- **파일**: `components/ui/button.tsx`
- **위치**: 11번째 줄 `default` variant 클래스
- **설명**: `[a]:hover:bg-primary/80` 셀렉터는 Tailwind v4의 arbitrary variant 문법이지만, 실제로 `<a>` 태그(Next.js `<Link>` 포함)가 `<button>`을 감싸거나 그 반대 구조에서 기대하는 방식으로 동작하지 않는다. `@base-ui/react`의 `Button` 컴포넌트가 렌더링하는 DOM 구조에서 이 셀렉터가 매칭되지 않아 `<Link>`에 `buttonVariants()`를 적용한 경우(`app/page.tsx`, `app/not-found.tsx`) 호버 배경색이 전혀 표시되지 않는다.
- **재현 방법**:
  1. 홈 페이지(`/`) 방문
  2. "대시보드 보기" 버튼(Link 기반) 위에 마우스 커서를 올림
- **예상 결과**: `primary` 색상의 80% 불투명도 배경으로 호버 피드백 표시
- **실제 결과**: 호버 시 배경색 변화 없음 (default variant 버튼에 한함)
- **수정 방안**:
  ```tsx
  // [a]:hover:bg-primary/80 → hover:bg-primary/80 또는 hover:bg-primary/90
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  ```

---

### [High] `DashboardLayout`의 사이드바가 모바일 화면에서 레이아웃을 붕괴시킴

- **파일**: `app/dashboard/layout.tsx`
- **위치**: 18~36번째 줄 전체 레이아웃 구조
- **설명**: 사이드바(`<aside className="w-56 ...">`)가 고정 너비 `w-56(224px)`로 항상 표시된다. 모바일(~640px) 환경에서 사이드바와 콘텐츠 영역이 가로로 나란히 배치되면 콘텐츠 영역이 매우 좁아지거나 화면을 벗어나는 오버플로우가 발생한다. `shrink-0`으로 인해 사이드바는 절대 축소되지 않으며, 햄버거 메뉴 등 모바일 대응 UI가 전혀 없다.
- **재현 방법**:
  1. `/dashboard` 접속
  2. 브라우저 창을 375px(iPhone SE) 너비로 축소
- **예상 결과**: 모바일에서 사이드바가 숨겨지고 햄버거 메뉴로 대체됨
- **실제 결과**: 사이드바(224px) + 콘텐츠가 가로로 나열되어 콘텐츠 영역이 151px 미만으로 좁아짐
- **수정 방안**:
  ```tsx
  // 사이드바에 모바일 숨김 처리 추가
  <aside className="hidden md:flex w-56 border-r bg-muted/30 shrink-0 flex-col">
  // 모바일용 Sheet/Drawer 컴포넌트로 사이드바 토글 구현
  ```

---

### [Medium] `Header`가 서버 컴포넌트인데 `"use client"` 컴포넌트인 `ThemeToggle`을 직접 포함

- **파일**: `components/common/Header.tsx`
- **위치**: 31번째 줄 `<ThemeToggle />`
- **설명**: `Header`는 `"use client"` 지시자가 없으므로 서버 컴포넌트이다. 그러나 `ThemeToggle`(`"use client"`)을 직접 import하여 렌더링하고 있다. React Server Components 규칙상 이는 허용되지만, `Header` 전체가 클라이언트 번들에 포함될 우려가 있다. 더 중요한 것은 현재 구조에서 `Header`가 서버 컴포넌트로 의도되었다면 서버 데이터(예: 로그인 상태)를 직접 fetch하여 내려줄 수 없는 구조적 한계가 생긴다. 실제 동작에는 문제없으나 아키텍처 관점에서 명시적 의도가 불분명하다.
- **재현 방법**: 해당 없음 (정적 분석)
- **예상 결과**: `Header`가 서버/클라이언트 역할이 명확히 분리됨
- **실제 결과**: `Header`가 암묵적으로 클라이언트 컴포넌트 트리에 포함됨
- **수정 방안**: `Header`에 서버 데이터 fetch 로직 추가 계획이 있다면 `ThemeToggle`을 별도 `Suspense` 경계로 감싸거나, `Header`를 명시적으로 `"use client"`로 선언하고 역할을 분명히 할 것

---

### [Medium] `use-media-query.ts`에 `"use client"` 지시자가 있으나 파일은 `.ts` 확장자

- **파일**: `hooks/use-media-query.ts`
- **위치**: 1번째 줄 `"use client"`
- **설명**: Next.js에서 `"use client"` 지시자는 일반적으로 React 컴포넌트 파일(`.tsx`)에 사용한다. 훅 파일(`.ts`)에도 유효하지만, `window.matchMedia`를 사용하는 훅 파일에 해당 지시자를 붙이는 것은 Next.js 규칙상 불필요하다. 훅 자체는 브라우저 API를 사용하므로 반드시 클라이언트 컴포넌트에서만 호출되어야 하는데, 지시자가 훅 파일에 있으면 이를 가져오는 모든 모듈이 자동으로 클라이언트 번들에 포함된다. 기능적 오류는 없지만 번들 크기 최적화 관점에서 불필요한 클라이언트 번들 포함이 발생할 수 있다.
- **재현 방법**: 해당 없음 (정적 분석)
- **예상 결과**: 훅을 사용하는 컴포넌트에서만 클라이언트 경계 선언
- **실제 결과**: `use-media-query.ts`를 import하는 모든 모듈이 자동으로 클라이언트 번들에 포함됨
- **수정 방안**: `hooks/use-media-query.ts`의 `"use client"` 지시자를 제거하고, 해당 훅을 사용하는 컴포넌트에서 `"use client"` 선언을 유지할 것

---

### [Medium] `ThemeToggle`의 `resolvedTheme`이 `undefined`일 때 `aria-label`이 현재 상태를 반영하지 않음

- **파일**: `components/common/ThemeToggle.tsx`
- **위치**: 11~21번째 줄
- **설명**: 버튼의 `aria-label`이 `"테마 전환"`으로 고정되어 있어 현재 활성 테마(라이트/다크)와 전환 후 상태를 스크린 리더가 구분할 수 없다. 또한 마운트 전에 Sun/Moon 아이콘이 CSS transition으로 표시/숨김 처리되지만, 스크린 리더에는 두 아이콘 모두(`aria-hidden`이 없으므로) 읽힐 수 있다.
- **재현 방법**: 스크린 리더(NVDA, VoiceOver)로 ThemeToggle 버튼 포커스
- **예상 결과**: "다크 모드로 전환" 또는 "라이트 모드로 전환"처럼 맥락 있는 레이블
- **실제 결과**: "테마 전환"만 읽힘, 현재 상태 알 수 없음
- **수정 방안**:
  ```tsx
  aria-label={resolvedTheme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
  ```

---

### [Medium] 로그인/회원가입 `CardFooter` 구조적 문제 — `<form>` 태그가 `Card` 컴포넌트 계층을 가로지름

- **파일**: `app/login/page.tsx`, `app/signup/page.tsx`
- **위치**: login 27~65번째 줄, signup 27~76번째 줄
- **설명**: `<form>` 태그가 `<CardHeader>` 바깥에서 시작하여 `<CardContent>`와 `<CardFooter>`를 감싸고 있다. `<Card>` 컴포넌트 내부에서 `<form>`이 중간에 삽입된 구조(`<Card> → <CardHeader> → <form> → <CardContent> → <CardFooter> → </form> → </Card>`)는 HTML 스펙상 블록 요소 안에 블록 요소가 올바르게 중첩되어야 한다는 규칙에는 부합하지만, `CardFooter` 내 `data-slot="card-footer"` 기반 CSS selector(`has-data-[slot=card-footer]:pb-0`)가 `<Card>` 직계 자식에만 적용되도록 설계된 경우 `<form>` 중간 레이어로 인해 CSS 계산이 의도대로 되지 않을 수 있다.
- **재현 방법**: 로그인/회원가입 페이지에서 카드 하단 여백 확인
- **예상 결과**: `CardFooter`가 있을 때 카드 하단 패딩이 0으로 상쇄됨
- **실제 결과**: `<form>` 태그가 중간에 끼어 `has-data-[slot=card-footer]` CSS 셀렉터가 매칭되지 않아 하단 여백이 이중으로 적용될 수 있음
- **수정 방안**:
  ```tsx
  <Card>
    <CardHeader>...</CardHeader>
    <CardContent>
      <form id="login-form" ...>
        {/* 입력 필드 */}
      </form>
    </CardContent>
    <CardFooter>
      <Button type="submit" form="login-form">로그인</Button>
    </CardFooter>
  </Card>
  ```

---

### [Medium] `next.config.ts`의 `cacheComponents` 옵션이 Next.js 16 공식 옵션이 아닐 수 있음

- **파일**: `next.config.ts`
- **위치**: 5번째 줄 `cacheComponents: true`
- **설명**: Next.js 16의 `"use cache"` 지시자는 `next.config.ts`에서 `experimental.dynamicIO` 또는 별도 플래그로 활성화된다. `cacheComponents`라는 옵션명은 공식 문서에서 확인되지 않는다. 잘못된 설정 키는 무시되거나(경고 없이 스킵) 예상과 다른 동작을 일으킬 수 있다. `"use cache"` 지시자가 실제로 활성화되지 않은 상태라면 `dashboard/page.tsx`의 `getDashboardStats` 함수가 캐시 없이 매 요청마다 실행된다.
- **재현 방법**: 빌드 로그 또는 Next.js 설정 검증 결과 확인
- **예상 결과**: `"use cache"` 지시자가 정상 활성화되어 함수 결과가 캐시됨
- **실제 결과**: `cacheComponents` 옵션이 인식되지 않아 캐시 기능이 비활성 상태일 가능성
- **수정 방안**: Next.js 16 공식 문서(`node_modules/next/dist/docs/`) 확인 후 올바른 옵션키로 교체. 예시:
  ```ts
  const nextConfig: NextConfig = {
    experimental: {
      dynamicIO: true, // "use cache" 활성화 플래그 (버전에 따라 상이)
    },
  }
  ```

---

### [Low] `signup/page.tsx`의 이름/성 필드 레이블 순서가 한국어 관례와 반대

- **파일**: `app/signup/page.tsx`
- **위치**: 29~38번째 줄
- **설명**: 회원가입 폼에서 첫 번째 칸이 `"이름"` (`firstName`, placeholder: `"홍"`), 두 번째 칸이 `"성"` (`lastName`, placeholder: `"길동"`)으로 되어 있다. 한국어 이름 관례에서 성이 먼저 오므로(`홍길동`에서 `홍`이 성) 필드명과 placeholder가 뒤바뀌어 있다. 또한 영어권 `firstName`/`lastName` 개념을 그대로 사용하여 실제 한국 사용자가 혼동할 수 있다.
- **재현 방법**: `/signup` 페이지에서 이름 입력 필드 확인
- **예상 결과**: 성(family name) 입력 필드가 왼쪽, 이름(given name)이 오른쪽 (또는 단일 "이름" 필드로 통합)
- **실제 결과**: 레이블 "이름"에 placeholder `"홍"` (성)이 표시됨
- **수정 방안**: 레이블을 `"성"`/`"이름"` 순서로 재배치하거나, 단일 `name` 필드로 통합하고 서버에서 성/이름을 처리할 것

---

### [Low] Footer 저작권 연도가 하드코딩됨

- **파일**: `components/common/Footer.tsx`
- **위치**: 7번째 줄
- **설명**: `© 2026 StarterKit`으로 연도가 하드코딩되어 있다. 향후 해마다 수동으로 업데이트해야 하며, 빌드 시점의 연도와 다를 경우 오래된 정보를 표시하게 된다.
- **재현 방법**: 2027년 이후 서비스 운영 시 Footer 확인
- **예상 결과**: 현재 연도 자동 반영
- **실제 결과**: `2026`으로 고정 표시
- **수정 방안**:
  ```tsx
  <p>© {new Date().getFullYear()} StarterKit. All rights reserved.</p>
  ```
  단, 서버 컴포넌트에서 `new Date()`를 사용하면 빌드 시점이 아닌 요청 시점 연도가 반영된다는 점 고려.

---

### [Low] `Header`에 현재 활성 경로 표시(active state)가 없음

- **파일**: `components/common/Header.tsx`
- **위치**: 11~29번째 줄 `<nav>` 내부 Link 요소들
- **설명**: 상단 내비게이션의 Link들은 항상 동일한 스타일(`text-foreground/60`)로 표시된다. `NavItem` 컴포넌트는 `usePathname()`으로 활성 경로를 하이라이트하는 반면, `Header`의 nav link들은 현재 페이지를 시각적으로 구분하지 않는다. 사용자가 현재 위치를 파악하기 어렵고 접근성 관점에서 `aria-current="page"` 속성도 없다.
- **재현 방법**: 홈, 대시보드, 로그인 페이지를 순서대로 방문하며 헤더 내비게이션 확인
- **예상 결과**: 현재 페이지에 해당하는 nav link가 시각적으로 구분됨
- **실제 결과**: 모든 nav link가 동일한 스타일로 표시됨
- **수정 방안**: `Header`를 `"use client"`로 변환하거나 `NavLink` 서브 컴포넌트를 분리하여 `usePathname()` 기반 활성 스타일 + `aria-current="page"` 적용

---

### [Low] `dashboard/page.tsx`의 활동 목록 시간 데이터가 상대적 문자열로 하드코딩됨

- **파일**: `app/dashboard/page.tsx`
- **위치**: 32~36번째 줄 `recentActivities` 배열
- **설명**: "2분 전", "15분 전" 등 상대 시간이 정적 문자열로 하드코딩되어 있다. 실제 서비스에서는 이 값들이 항상 동일하게 표시되어 신뢰성을 해친다. 스타터킷 예제 데이터라도 `time` 필드를 ISO 날짜 형식으로 저장하고 `Intl.RelativeTimeFormat` 또는 라이브러리로 포맷하는 패턴을 보여주는 것이 더 적합하다.
- **재현 방법**: `/dashboard` 페이지를 1시간 후에 다시 방문
- **예상 결과**: 현재 시각 기준 상대 시간 재계산
- **실제 결과**: "2분 전", "15분 전" 등 변하지 않는 고정 문자열 표시
- **수정 방안**: `time` 필드를 `Date` 또는 ISO 문자열로 변경하고 `Intl.RelativeTimeFormat`을 활용하는 유틸 함수 추가

---

## 총평

이 프로젝트는 Next.js 16 + shadcn/ui(base-nova) 스타터킷으로서 기본 아키텍처(App Router, ThemeProvider, Server/Client 컴포넌트 분리)는 올바르게 구성되어 있습니다. 그러나 **폼 제출 로직 부재(Critical)**와 **미구현 링크 다수(High)**는 실제 서비스 전 반드시 해결해야 합니다. 또한 **모바일 반응형 대응(High)** 및 **ThemeToggle 마운트 전 상태 처리(High)**도 사용자 경험에 직접 영향을 미치므로 조기 수정을 권장합니다.
