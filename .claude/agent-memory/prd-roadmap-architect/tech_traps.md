---
name: tech-traps
description: 로드맵·태스크 작성 시 반드시 명시해야 할 이 프로젝트의 기술 함정 (견적서 도메인 + PDF 추가)
metadata:
  type: project
---

로드맵의 모든 신규 태스크에는 해당 시 다음 함정을 "함정·메모" 칸에 명시한다. CLAUDE.md 에 이미 문서화되어 있으나, 로드맵 독자가 CLAUDE.md 를 안 봐도 알 수 있게 반복 명시.

1. **Next.js 16 비동기 params**: `params` / `searchParams` 는 `Promise` 타입 → 반드시 `await`. 동적 라우트 `/q/[slug]`, `/q/[slug]/pdf` 모두 해당.
2. **cacheComponents + Suspense**: `next.config.ts` 에서 `cacheComponents: true`. 동적 라우트(`[slug]`)에서 `params` await 후 데이터를 페치하는 컴포넌트는 **반드시 `<Suspense>` 안에 배치**. 그렇지 않으면 `Uncached data was accessed outside of <Suspense>` 빌드 에러.
3. **ISR 표현 방식**: `export const revalidate = N` 금지. 대신 `"use cache"` + `cacheLife("minutes")`. 모듈(`lib/quotes.ts`)이 아니라 호출부(페이지)에서 캐시 범위 지정. 견적은 태그 `quote:${slug}` 로 on-demand revalidate.
4. **shadcn/ui = @base-ui/react (Radix 아님)**: 컴포넌트 API가 기존 shadcn/Radix와 다름. props는 항상 `components/ui/*.tsx` 실제 파일에서 확인.
5. **NOTION_TOKEN 서버 전용**: `NEXT_PUBLIC_` 접두사 절대 금지. `lib/quotes.ts` 첫 줄 `import "server-only"` 가드 필수. 클라이언트 컴포넌트에서 import 금지.
6. **@notionhq/client v5 2단계 패턴**: `databases.query` 가 **제거됐다**. `databases.retrieve({database_id})` → 응답의 `data_sources[0].id` → `dataSources.query({data_source_id, filter, sorts, page_size, start_cursor})`. v4 시절 코드·튜토리얼은 그대로 못 쓴다. `databases.create` 의 `properties` 도 v5에서 무시되니 DB 생성 후 `dataSources.update` 로 속성 정의.
7. **server-only 가드 + 테스트 스크립트**: 순수 Node 환경(`tsx`/`node --import tsx`)에서는 `react-server` condition 이 없어 throw. `scripts/test/<name>.ts` 는 `lib/quotes` 모듈을 직접 import 하지 말고 동일 로직을 인라인 복제(또는 v5 SDK만 직접 사용). 레퍼런스: `scripts/test/notion-client.ts`.
8. **PDF 생성 — Vercel Function 제약**: `@sparticuz/chromium` + `puppeteer-core` 는 Vercel Function 메모리 1024MB 이상 권장, 콜드스타트 1~3초. `puppeteer-core` 만 의존성에 넣고 풀 `puppeteer` 는 금지(Vercel 크기 제한 초과). `runtime = "nodejs"` 명시 (edge 불가).
9. **Notion `file.url` 1시간 만료**: 견적서 본문에 이미지가 있다면 `next/image` 필수. `<img>` 직접 사용 금지. `next.config.ts` `images.remotePatterns` 3종 호스트 등록 확인.

**Why**: Next.js 16은 학습 데이터에 없을 가능성이 높고(AGENTS.md 의 "This is NOT the Next.js you know"), Cache Components / `@base-ui/react` / Notion v5 2단계 / PDF 환경 4종은 빌드 에러·런타임 실패로 직결되는 함정이라 매 태스크에서 환기되어야 한다.

**How to apply**: 새로운 라우트/컴포넌트/페치/PDF 태스크를 추가할 때, 위 항목 중 해당하는 것을 "함정·메모" 칸에 1줄 이상 명시. 관련: [[project-identity]], [[testing-requirements]].
