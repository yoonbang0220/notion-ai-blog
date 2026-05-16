# nextjs-starter-optimizer 메모리 인덱스

- [Project identity](project_identity.md) — 이 저장소는 스타터킷이 아니라 Notion CMS 기반 AI 학습 블로그 MVP; SSOT 는 docs/NOTION_BLOG_PRD.md
- [Next.js 16 Cache Components 함정](nextjs16_cache_components_pitfalls.md) — 동적 라우트는 Suspense 안에 데이터 페치를 둬야 빌드 통과 (cacheLife=minutes 가 ISR 60초)
- [base-nova shadcn 함정](base_nova_shadcn_pitfalls.md) — @base-ui/react 기반; field/label/separator 묶음 의존; API 는 실제 파일에서 확인
- [스타터킷 비대 패턴](starter_kit_bloat_patterns.md) — 인증/대시보드/dialog/dropdown/use-media-query/Vercel SVG 등 자주 함께 사라지는 묶음
