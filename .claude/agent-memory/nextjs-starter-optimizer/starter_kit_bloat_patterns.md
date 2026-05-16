---
name: starter-kit-bloat-patterns
description: 이 base-nova 스타터킷에서 자주 함께 제거되는 비대 요소 묶음
metadata:
  type: feedback
---

이번 정리 작업(2026-05-17)에서 도출한, 범용 Next.js 스타터킷을 특정 도메인 프로젝트로 좁힐 때 자주 함께 사라지는 묶음.

**Why:** 스타터킷은 "보여주기용 데모" 와 "실제로 쓰일 인프라" 가 섞여 있다. PRD 로 도메인이 좁혀지면 데모 영역은 손실 없이 통째로 제거 가능하다.

**How to apply:** 다음 묶음이 보이면 PRD 와 grep 확인 후 통째 제거 검토.

- **인증/대시보드 데모 묶음** (블로그·랜딩·CMS 같은 비인증 도메인일 때):
  - `app/login`, `app/signup`, `app/dashboard/**`
  - `components/login-form.tsx`, `components/common/NavItem.tsx`
  - `.env.example` 의 `NEXTAUTH_*`, `*_CLIENT_ID`, `DATABASE_URL` 라인
- **사용처 0건이 흔한 shadcn 컴포넌트**: `dialog`, `dropdown-menu` (대시보드 사이드바·사용자 메뉴 컨텍스트가 없으면 거의 미사용).
- **사용처 0건이 흔한 보조 자산**: `hooks/use-media-query.ts`, `types/index.ts` 의 `User`/`ApiResponse`/`PaginatedResponse` (인증·API 클라이언트 없으면 안 쓰임).
- **Vercel 데모 SVG**: `public/` 의 `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`. create-next-app 기본 자산.
- **Hook 검증 임시 파일**: `roots/test.txt` — CLAUDE.md 에 "프로젝트 코드 아님" 명시. `hook-test.txt` 는 `.gitignore` 처리되어 있고 PreToolUse 훅이 계속 append 하므로 제거 금지.
- **옛 PRODUCT_SPEC.md** (스타터킷 역기획서): 도메인이 바뀌면 SSOT 충돌을 일으키므로 새 PRD(`docs/<DOMAIN>_PRD.md`)로 단일화 권장.

작업 순서 팁: 삭제 → `npm run lint` → `npm run build` 로 끊긴 import 즉시 검출. base-nova + cacheComponents 환경에서는 빌드까지 돌려야 PPR 관련 함정([[nextjs16-cache-components-pitfalls]])이 드러난다.
