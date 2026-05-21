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
- W1 견적서 페치 레이어: `import "server-only"` 가드, `requireEnv` 3종, v5 2단계 패턴(databases.retrieve → dataSources.query), PROP/ITEM_PROP/STATUS 한글 매핑 상수, lazy 캐시 패턴
- W1 Cache Components 패턴: 정적 셸 + `<Suspense>` + `QuoteResolver` 중간 컴포넌트 구조로 params await를 Suspense 경계 안으로 미룸
- W1 자기검증 스크립트: `server-only` 가드 우회를 위한 인라인 복제 패턴, 10시나리오 + process.exitCode

**반복 지적 가능성이 높은 안티패턴:**
- `index` 를 React key로 사용 — `dashboard/page.tsx`의 recentActivities.map, `quote-view.tsx`의 items.map에서 동일하게 발생 (아이템명 + index 조합 패턴 반복)
- 폼 컴포넌트에 `<form>` 태그 없이 버튼만 사용 — login/signup page가 서버 컴포넌트이면서 폼 제출 로직 없음
- `href="#"` 사용 — Footer의 링크들이 더미 href 사용
- `hasMissingRequired` 판정이 UI 컴포넌트에서도 중복 — `normalizeQuote`에서 이미 warn 처리 후 UI에서도 null 체크 중복. 일관성은 있으나 명확히 분리됐는지 확인 필요
- 부가세 0% 조건: UI(`taxRate > 0`)와 타입 계산 모두 일관되게 처리됨 — 올바른 패턴
- Bearer 토큰 비교를 `!==` 단순 비교로 구현 — W2에서 `revalidate/route.ts`에서 반복. `crypto.timingSafeEqual`로 교체 필수 (C1 지적)

**도메인 특이사항 (W1 견적서):**
- Notion formula 타입(`슬러그`)은 dataSources.query 필터 불가 — "상태=발행 전체 페치 후 코드 측 slug 비교 + 페이지네이션" 폴백 패턴이 정착됨
- 모든 금액 계산은 Notion 저장값(`금액`/`총금액`) 무시하고 코드 자체 계산이 SSOT
- 속성명/상태값이 한글이므로 PROP/ITEM_PROP/STATUS 매핑 상수를 반드시 경유해야 함 — 영문 하드코딩은 즉시 실패
- `CardHeader`의 grid-cols 2열 레이아웃은 `has-data-[slot=card-action]` 트리거가 정식 방법. `grid-cols-[1fr_auto]`를 직접 주입하는 방식도 작동하나 shadcn base-nova 의도에서 벗어남

**아키텍처 특이사항:**
- 대시보드 레이아웃은 루트 레이아웃(Header/Footer 포함)과 중첩 — 결과적으로 min-h 계산에서 헤더/푸터 높이를 하드코딩(`8rem`)으로 처리
- `sidebarItems`가 `dashboard/layout.tsx`에 정적 배열로 선언 — 인증 상태에 따른 분기 없음
- Footer 링크들이 `<a>` 태그 사용 — Next.js `<Link>` 미사용 (외부 링크가 아닌데도)

**W2 PDF/Revalidate 패턴 (2026-05-21 관찰):**
- `finally { await browser?.close() }` 패턴으로 puppeteer 리소스 누수 방지 — 올바른 패턴
- `export const runtime` 생략이 `cacheComponents:true`와의 충돌 회피를 위한 의도적 선택 — 이유를 주석으로 명시하는 규칙이 정착됨
- `revalidateTag(tag, { expire: 0 })` — Next.js 16.2.6에서 webhook 즉시 만료 패턴, 두 번째 인자 형식
- PDF 라우트에서 500 응답에 내부 에러 메시지(`error.message`) 노출 — 반복 위험. 클라이언트 응답은 일반 메시지만, 서버 로그에 상세 기록하는 패턴으로 통일 필요
- `--no-sandbox` 플래그를 로컬 환경에서도 적용하는 패턴 — Linux 컨테이너에서만 필요. 플랫폼 분기 권장
- `data-print-hide` 속성이 실제 CSS/JS 처리 없이 선언됨 — 의도 불명확. `print:hidden` Tailwind 클래스와 역할 중복 가능성 확인 필요
