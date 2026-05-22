# Phase 3 / T3.5 — 다크모드 검증 노트

> 작성: 2026-05-22 · 대상: 관리자 화면(`/admin`, `/admin/login`) 및 전역 다크모드
> ⚠️ **다크모드는 이 단계에서 새로 만든 기능이 아니다.** 스타터/W1 시절부터 `next-themes` 로
> 이미 구현돼 있었고(PRD 부록 A.6 "이미 구현됨"), T3.5 는 **검증 + 관리자 화면 일관성 확인**만 수행한다.
> 신규 다크모드 자산(Provider/Toggle/토큰) 추가 **0**.

## 1. 구성 (기존 자산 — 변경 없음)

| 요소 | 위치 | 역할 |
|------|------|------|
| `ThemeProvider` | `components/common/ThemeProvider.tsx` | `next-themes` 래퍼 |
| 설정 | `app/layout.tsx` | `attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`, `<html lang="ko" suppressHydrationWarning>` |
| `ThemeToggle` | `components/common/ThemeToggle.tsx` | `resolvedTheme` 기준 라이트↔다크 토글(클릭 시 `setTheme` → `localStorage["theme"]` 저장), Sun/Moon 아이콘, `aria-label="테마 전환"` |
| 토큰 | `app/globals.css` | `.dark` 블록의 oklch 토큰 + `@custom-variant dark (&:is(.dark *))` |

- 동작 원리: 첫 방문(저장된 선호 없음)은 `defaultTheme="system"` + `enableSystem` 으로 **OS 설정을 추종**한다. 사용자가 토글하면 명시 선호가 `localStorage["theme"]` 에 저장되어 이후 방문에 **복원**되며, OS 설정보다 우선한다.
- 색은 **CSS 토큰만** 사용(하드코딩 0)하므로 모든 화면이 `.dark` 클래스 토글만으로 자동 대응한다.

## 2. 검증 결과 (2026-05-22, Playwright MCP)

### 2.1 시스템 추종 + 선호 복원(persist)

`prefers-color-scheme` 를 에뮬레이션(`page.emulateMedia`)하고 `localStorage["theme"]` 를 조작해 `<html>` 의 `.dark` 클래스 적용을 측정. **4케이스 전부 기대대로 PASS**:

| 케이스 | OS 설정 | 저장 선호 | 기대 | 실측 |
|--------|---------|-----------|------|------|
| 시스템 추종(다크) | dark | 없음 | 다크 | ✅ dark |
| 시스템 추종(라이트) | light | 없음 | 라이트 | ✅ light |
| 선호 복원(다크) | light | `dark` | 다크(선호 우선) | ✅ dark |
| 선호 복원(라이트) | dark | `light` | 라이트(선호 우선) | ✅ light |

→ `defaultTheme="system"` OS 추종 및 `localStorage["theme"]` persist/우선순위 정상.

### 2.2 관리자 화면 라이트/다크 렌더

| 화면 | 라이트 | 다크 |
|------|--------|------|
| `/admin` (견적 목록) | ✅ 정상 | ✅ 정상(표·뱃지·버튼 가독성, T3.3 검증) |
| `/admin/login` (로그인) | ✅ 정상 | ✅ 정상(카드·입력·버튼 가독성) |

- 색 하드코딩 0(토큰만) → 두 테마 모두 대비·가독성 유지. 콘솔 에러 0.
- 글로벌 헤더의 `ThemeToggle` 을 그대로 사용(관리자 전용 토글·토큰 신규 생성 없음).

## 3. 결론

- 다크모드는 전역(랜딩·견적·관리자)에서 토큰 기반으로 일관 동작하며, 관리자 화면도 별도 작업 없이 자동 대응한다.
- T3.5 범위(검증 + 관리자 일관성)에서 추가 구현·신규 자산은 없다. 과설계 회피(PRD A.6).
