# nextjs-starter-optimizer 메모리 인덱스

- [Project identity](project_identity.md) — 저장소 정체성. 현재는 Notion 기반 견적서 웹뷰어 MVP (블로그→견적서 2차 전환, 2026-05-17); SSOT 는 docs/QUOTE_VIEWER_PRD.md
- [Domain pivot pattern](domain_pivot_pattern.md) — 같은 저장소 도메인 A→B 전환 시 "패키지는 그대로, 라우트/lib/types/문서만 들어낸다" 작업 분리 원칙
- [Next.js 16 Cache Components 함정](nextjs16_cache_components_pitfalls.md) — 동적 라우트는 Suspense 안에 데이터 페치를 둬야 빌드 통과 (cacheLife=minutes 가 ISR)
- [base-nova shadcn 함정](base_nova_shadcn_pitfalls.md) — @base-ui/react 기반; field/label/separator 묶음 의존; API 는 실제 파일에서 확인
- [스타터킷 비대 패턴](starter_kit_bloat_patterns.md) — 인증/대시보드/dialog/dropdown/use-media-query/Vercel SVG 등 자주 함께 사라지는 묶음
