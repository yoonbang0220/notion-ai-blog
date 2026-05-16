---
name: tech-traps
description: 로드맵·태스크 작성 시 반드시 명시해야 할 이 프로젝트의 기술 함정 4종
metadata:
  type: project
---

로드맵의 모든 신규 태스크에는 해당 시 다음 함정을 "함정·메모" 칸에 명시한다. CLAUDE.md 에 이미 문서화되어 있으나, 로드맵 독자가 CLAUDE.md 를 안 봐도 알 수 있게 반복 명시.

1. **Next.js 16 비동기 params**: `params` / `searchParams` 는 `Promise` 타입 → 반드시 `await`.
2. **cacheComponents + Suspense**: `next.config.ts` 에서 `cacheComponents: true`. 동적 라우트(`[slug]`)에서 `params` await 후 데이터를 페치하는 컴포넌트는 **반드시 `<Suspense>` 안에 배치**. 표준 패턴은 `app/posts/[slug]/page.tsx`.
3. **ISR 표현 방식**: `export const revalidate = N` 금지. 대신 `"use cache"` + `cacheLife("minutes")`. 모듈(`lib/notion.ts`)이 아니라 호출부(페이지)에서 캐시 범위 지정.
4. **shadcn/ui = @base-ui/react (Radix 아님)**: 컴포넌트 API가 기존 shadcn/Radix와 다름. props는 항상 `components/ui/*.tsx` 실제 파일에서 확인. 폼은 `field.tsx` + `separator.tsx` 조합.
5. **NOTION_TOKEN 서버 전용**: `NEXT_PUBLIC_` 접두사 절대 금지. `lib/notion.ts` 는 클라이언트 컴포넌트에서 import 금지. `server-only` 패키지 가드 권장.

**Why**: Next.js 16은 학습 데이터에 없을 가능성이 높고(AGENTS.md 의 "This is NOT the Next.js you know"), Cache Components 와 `@base-ui/react` 는 빌드 에러로 직결되는 함정이라 매 태스크에서 환기되어야 한다.

**How to apply**: 새로운 라우트/컴포넌트/페치 태스크를 추가할 때, 위 5종 중 해당하는 항목을 "함정·메모" 칸에 1줄 이상 명시. 관련: [[project-identity]].
