---
name: project-identity
description: 이 저장소는 스타터킷이 아니라 Notion CMS 기반 AI 학습 블로그 MVP다 — 단일 출처는 docs/NOTION_BLOG_PRD.md
metadata:
  type: project
---

이 저장소(notion-prd)는 한때 `yoonbang_starter_kit` 라는 범용 Next.js 스타터킷이었으나, 2026-05-17 정리 작업으로 Notion CMS 기반 AI 학습 블로그 MVP 로 전환됐다.

**Why:** 운영자가 비개발자 AI 입문자 대상의 "초보가 쓴 초보 가이드" 블로그를 만들기 위함. PRD 는 `docs/NOTION_BLOG_PRD.md` 에 있고 이것이 단일 출처(SSOT)다.

**How to apply:**
- 새 기능 제안 시 PRD 의 우선순위(P0/P1/Future)와 IA 를 먼저 확인할 것.
- "스타터킷"이라는 단어를 보고 범용 기능을 추가하려는 충동을 경계할 것. 로그인/대시보드/사용자 관리는 의도적으로 제거됨.
- `package.json` 의 `"name": "yoonbang_starter_kit"` 는 미변경 — 정체성 혼동 유발 가능. 패키지명 변경은 사용자 결정 영역으로 남겨둠.
- 관련: [[nextjs16-cache-components-pitfalls]], [[base-nova-shadcn-pitfalls]]
