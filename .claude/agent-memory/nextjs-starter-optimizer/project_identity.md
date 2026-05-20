---
name: project-identity
description: 이 저장소는 Notion 기반 견적서 웹뷰어 + PDF MVP (2026-05-17 블로그→견적서 도메인 전환) — 단일 출처는 docs/QUOTE_VIEWER_PRD.md
metadata:
  type: project
---

이 저장소(notion-prd)는 두 번의 도메인 전환을 거쳤다:
1. 2026-05-17 이전: 범용 Next.js 스타터킷 `yoonbang_starter_kit`
2. 2026-05-17 1차: Notion CMS 기반 AI 학습 블로그 MVP (`docs/NOTION_BLOG_PRD.md`)
3. 2026-05-17 2차(현재): Notion 기반 견적서 웹뷰어 + PDF 다운로드 MVP (`docs/QUOTE_VIEWER_PRD.md`)

블로그 시절 자산은 `docs/archive/` 에 보존됨 (`NOTION_BLOG_PRD.md`, `ROADMAP.md`, `BUG_REPORT.md`, `shrimp-rules.md`, `shrimp-backup/`).

**Why:** 운영자(1인~소규모 디자인/외주 사업자)가 Notion 에 적은 견적을 클라이언트(비개발자 의사결정자)에게 로그인 없이 공유하고 PDF 한 번 클릭으로 결재용 파일을 받게 하기 위함. SSOT 는 `docs/QUOTE_VIEWER_PRD.md`.

**How to apply:**
- 새 기능 제안 시 PRD 의 우선순위(P0/Future)와 IA(`/`, `/q/[slug]`, `/q/[slug]/pdf`, `/api/revalidate`) 를 먼저 확인할 것.
- "스타터킷" / "블로그" 단어를 보고 범용 기능이나 글 목록·태그·카테고리 같은 블로그 잔재를 추가하려는 충동을 경계할 것. 모두 의도적으로 제거됨.
- `package.json` 의 `"name": "yoonbang_starter_kit"` 는 미변경 — 정체성 혼동 유발 가능. 패키지명 변경은 사용자 결정 영역.
- 블로그 시절 마크다운 의존성(`notion-to-md`, `react-markdown`, `remark-gfm`, `rehype-highlight`)은 견적서에서 미사용이지만 `package.json` 미정리 — 사용자 검토 대상.
- W1 시작 시 `lib/quotes.ts` 작성은 `scripts/test/notion-client.ts` 의 `inlineQueryPublishedPages` 패턴(`databases.retrieve` → `dataSources.query` 2단계, server-only 가드, requireEnv)을 그대로 재사용.
- 관련: [[nextjs16-cache-components-pitfalls]], [[base-nova-shadcn-pitfalls]], [[starter-kit-bloat-patterns]]
