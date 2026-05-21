---
name: landing-page-t18
description: T1.8 랜딩 페이지(/) 정식화 — 정적 구조·검증 결과·다크모드 검증 방법
metadata:
  type: project
---

랜딩 페이지 `app/page.tsx`(T1.8)는 정적(`○ Static`) 서버 컴포넌트로, 히어로 + 운영자 3스텝 카드(shadcn Card) 구성. `"use client"`/`"use cache"`/`<Suspense>` 없음 → 빌드 출력에서 `┌ ○ /` 로 Static 유지(2026-05-21 실측 통과). 색은 토큰만(`text-muted-foreground`·`bg-muted`·`bg-card`·`text-foreground`·`border`), 하드코딩 0.

**Why:** PRD IA "랜딩=운영자용 정적 1페이지". 클라이언트는 `/q/[slug]` 직링크로만 진입하므로 견적목록·검색·로그인·대시보드는 범위 밖(Future).

**How to apply:** 랜딩 보완 시 정적 유지가 인수조건의 핵심 — 동적 데이터/캐시/Suspense 추가 금지. Header(`max-w-7xl`)·Footer 는 루트 레이아웃에 이미 있으니 페이지에서 재선언 금지. 페이지 콘텐츠 폭은 `max-w-5xl`(의도된 차이).

**다크모드 Playwright 검증법(검증됨):** next-themes 는 `localStorage.theme` 기반. `localStorage.setItem('theme','dark')` 직후 `classList.add('dark')` 하면 html 에 `light dark` 가 동시에 붙어 검증이 오염됨. → **localStorage 설정 후 `browser_navigate` 로 reload** 하면 next-themes 가 `dark` 클래스만 깔끔히 적용(body 배경 oklch 다크 확인). 라이트 복귀도 동일하게 theme=light 세팅 후 reload.

**모바일 가로스크롤 검증(375px):** `scrollWidth(360) <= innerWidth(375)` true. 3스텝이 `sm:grid-cols-3`(데스크톱 3열)↔모바일 1열 스택으로 자연 전환.

**검증 노이즈:** snapshot 의 `alert [ref]` 빈 요소와 화면 중앙 둥근 `N` 아이콘은 Next.js Dev Tools(개발 전용) — 페이지 콘텐츠 아님, 프로덕션엔 없음. dev 서버는 `npm run dev` 백그라운드 기동.
