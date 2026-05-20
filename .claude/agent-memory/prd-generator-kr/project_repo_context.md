---
name: project-repo-context
description: 이 저장소는 Notion CMS + Next.js 16 기반 MVP들이 누적되는 모노레포 성격. 신규 PRD 작성 시 기존 자산을 활용 전제로 한다.
metadata:
  type: project
---

이 저장소(`notion-prd/notion-prd`)는 **Notion을 단일 데이터 소스(SSOT)로 쓰는 Next.js 16 기반 MVP들의 인큐베이터**다. 첫 산출물은 `docs/NOTION_BLOG_PRD.md`(AI 학습 블로그), 두 번째는 `docs/QUOTE_VIEWER_PRD.md`(견적서 웹뷰어).

**Why:** 운영자는 동일 인물(berdanis4)이고, Notion 페치 레이어(`lib/notion.ts`)·서버 전용 가드·v5 SDK 함정·next.config remotePatterns·Tailwind v4 토큰·shadcn(base-nova) 같은 인프라를 매 MVP마다 재발명하지 않는다. 신규 PRD는 기존 `CLAUDE.md` 의 "함정 노트" 와 패턴을 그대로 상속받아야 한다.

**How to apply:**
- 신규 PRD의 [기술 스택] / [반드시 해야할 기술 스택] 절은 이미 검증된 스택(`@notionhq/client` v5 + `dataSources.query` 2단계 + `server-only` 가드 + `cacheLife("minutes")`)을 명시적으로 재사용 선언한다. 새 후보를 굳이 비교하지 않는다.
- [기획안] 절에서 페치 레이어 신규 모듈은 `lib/<domain>.ts` 컨벤션(예: `lib/quotes.ts`) + `scripts/test/<domain>-client.ts` 자기검증 패턴을 따르도록 명시한다.
- 검증 도구는 Playwright MCP 기본([[feedback-test-policy]] 참고 — 미작성).
- 새 도메인이 들어와도 `Status=Published` 게이트 + Slug 중복 검증 + 필수 속성 누락 시 skip 패턴은 거의 그대로 반복된다.
