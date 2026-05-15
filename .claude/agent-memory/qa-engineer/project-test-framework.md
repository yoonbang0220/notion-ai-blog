---
name: project-test-framework
description: nextjs-shadcn-starter 프로젝트의 테스트 프레임워크 설치 현황 — 미설치 상태
metadata:
  type: project
---

2026-05-14 기준 테스트 프레임워크가 설치되어 있지 않음.

`package.json`에 Jest, Vitest, Playwright, Cypress 관련 의존성 없음. `jest.config.*`, `vitest.config.*`, `playwright.config.*` 파일 없음.

**Why:** CLAUDE.md에 "테스트 설정 없음 — 필요 시 직접 구성해야 한다"고 명시됨.

**How to apply:** 테스트 코드 작성 요청 시 먼저 Vitest + @testing-library/react 설치 및 설정 파일 생성을 안내할 것. Next.js App Router 환경이므로 jsdom 환경 설정 필요.

추천 설치 명령:
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

[[project-qa-findings]] 참조
