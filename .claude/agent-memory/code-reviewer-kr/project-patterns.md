---
name: project-patterns
description: 이 프로젝트에서 관찰된 코딩 패턴, 안티패턴, 반복 지적 사항
metadata:
  type: project
---

## 관찰된 패턴

**올바르게 적용된 패턴:**
- CVA(class-variance-authority)로 Button variant/size 관리 — `button.tsx` 참고
- `cn()` 유틸리티 일관 사용
- `"use client"` 최소화 (ThemeProvider, ThemeToggle, Dialog, DropdownMenu, Label, Sonner)
- `"use cache"` 지시자 활용 (`dashboard/page.tsx`의 getDashboardStats)
- metadata export로 SEO 처리 (login, signup, dashboard page)
- `suppressHydrationWarning` 올바르게 html 태그에 적용
- `aria-label` ThemeToggle 버튼에 적용

**반복 지적 가능성이 높은 안티패턴:**
- `index` 를 React key로 사용 — `dashboard/page.tsx`의 recentActivities.map에서 발생
- 폼 컴포넌트에 `<form>` 태그 없이 버튼만 사용 — login/signup page가 서버 컴포넌트이면서 폼 제출 로직 없음
- `href="#"` 사용 — Footer의 링크들이 더미 href 사용
- `"비밀번호 찾기"` 링크가 `href="#"` — 실제 라우트 없음
- ThemeToggle에서 `theme === "light"` 직접 비교 — system 테마일 때 항상 dark로만 전환되는 버그
- `<Moon>` 아이콘에 `absolute` 포지션 없음 — Sun/Moon 겹침 구현이 position 의존적인데 Button 내부에 relative가 없을 수 있음
- `useMediaQuery` 훅의 SSR 하이드레이션 불일치 — 초기값 `false`이나 서버에서는 미디어쿼리 실행 불가
- `Label` 컴포넌트에 `"use client"` 선언 — 실제 브라우저 API/훅 불사용, 불필요할 수 있음
- `Input` 컴포넌트의 타입 prop: `InputPrimitive`에 전달하나 `@base-ui/react/input`이 HTML input을 그대로 렌더하므로 문제없음
- `dashboard/layout.tsx`에서 활성 링크 하이라이팅 없음 — `"use client"` + `usePathname` 미사용

**아키텍처 특이사항:**
- 대시보드 레이아웃은 루트 레이아웃(Header/Footer 포함)과 중첩 — 결과적으로 min-h 계산에서 헤더/푸터 높이를 하드코딩(`8rem`)으로 처리
- `sidebarItems`가 `dashboard/layout.tsx`에 정적 배열로 선언 — 인증 상태에 따른 분기 없음
- Footer 링크들이 `<a>` 태그 사용 — Next.js `<Link>` 미사용 (외부 링크가 아닌데도)
