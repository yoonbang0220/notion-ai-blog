---
name: project-qa-findings
description: nextjs-shadcn-starter 프로젝트 첫 QA 검수 결과 요약 — 반복 발생 가능한 버그 패턴과 취약 영역
metadata:
  type: project
---

2026-05-14 전체 정적 분석 QA 완료. 총 14건 발견(Critical 1, High 4, Medium 5, Low 4).

**Critical**: 로그인/회원가입 폼에 Server Action 또는 onSubmit 핸들러가 전혀 없음. 폼 제출 시 브라우저 기본 새로고침만 발생.

**Why:** 스타터킷이 UI 셸만 제공하고 인증 로직 연결을 의도적으로 생략한 것이나, 실제 서비스 확장 시 가장 먼저 구현해야 할 부분.

**How to apply:** 폼 관련 컴포넌트 작업 시 Server Action 또는 클라이언트 핸들러 연결 여부를 반드시 체크할 것.

---

**반복 발생 가능한 버그 패턴:**

1. **미구현 링크**: Footer(`/terms`, `/privacy`, `/contact`), 대시보드 사이드바 4개 하위 경로, `/forgot-password` 모두 404. 새 링크 추가 시 라우트 파일 동시 생성 필요.

2. **ThemeToggle 마운트 전 상태**: `resolvedTheme`이 `undefined`일 때 방어 코드 없음. `mounted` 상태 추가 패턴 권장.

3. **Button default variant 호버 셀렉터**: `[a]:hover:bg-primary/80`가 Link에 적용되지 않음. `hover:bg-primary/80`으로 수정 필요.

4. **대시보드 모바일 대응 없음**: `w-56 shrink-0` 사이드바가 소형 화면에서 레이아웃 붕괴.

5. **CardFooter CSS 셀렉터와 `<form>` 중간 레이어**: `<Card>` 직계 자식이 `<form>`으로 대체되면 `has-data-[slot=card-footer]` 셀렉터 매칭 실패 가능.

**취약 모듈:** `app/login/page.tsx`, `app/signup/page.tsx`, `components/common/ThemeToggle.tsx`, `app/dashboard/layout.tsx`

[[project-test-framework]] 참조 — 테스트 프레임워크 미설치 상태
