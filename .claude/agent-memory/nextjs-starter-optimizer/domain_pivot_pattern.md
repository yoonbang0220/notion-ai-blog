---
name: domain-pivot-pattern
description: 같은 저장소를 도메인 A → B 로 갈아끼울 때 "패키지는 그대로, 라우트/lib/types/문서만 들어낸다" 패턴
metadata:
  type: feedback
---

스타터킷이 도메인 A(블로그) 까지 한 번 진행된 상태에서 도메인 B(견적서) 로 갈아끼울 때, 사용자가 명시적으로 요청한 작업 분리 원칙.

**Why:** 두 도메인이 같은 기술 스택(Next.js 16 + @notionhq/client v5 + base-nova)을 공유하면, 패키지 정리·재설치는 작업 분량을 키우고 lockfile 충돌 위험만 만든다. 들어내기 → 다음 단계에 도메인 코드 재구성 → 그 시점에 사용자가 패키지 정리 결정. 단계 분리가 안전하다.

**How to apply:**
- **이번 단계(W0 초기화)에서 손대지 말 것**: `package.json` dependencies / devDependencies, `package-lock.json`, `node_modules`. 사용처 0건이 된 의존성(이번 케이스의 `notion-to-md`, `react-markdown`, `remark-gfm`, `rehype-highlight`)도 그대로 둔다.
- **들어낼 것**: 도메인 A 의 라우트(`app/<feature>/**`), lib 파일(`lib/<a-domain>.ts`), types(도메인 무관 타입만 남기고 비우기), 카피(layout 메타데이터/Header/Footer/page.tsx/not-found.tsx), 문서(PRD/ROADMAP/BUG_REPORT/룰).
- **아카이브 vs 삭제 결정 기준**:
  - 문서(`docs/*`, `BUG_REPORT.md`, `shrimp-rules.md`): `git mv` 로 `docs/archive/` 이동 → 히스토리 보존.
  - 코드 (`app/**`, `lib/<domain>.ts`): `git rm` → 깨끗히 삭제. 필요 시 git log 로 복구 가능.
  - gitignored 상태 데이터(`.shrimp/`): 일반 `mv` 로 옮긴 뒤 새 경로도 `.gitignore` 에 추가. 안 그러면 archive 옮기는 순간 gitignore 패턴이 안 먹어 커밋 후보가 된다.
- **보존할 것**: 도메인 무관 자산 — `components/ui/`, `lib/utils.ts`, `next.config.ts` (Notion 이미지 호스트 3종은 견적서에서도 동일), `scripts/test/notion-client.ts` (v5 SDK 패턴 레퍼런스), `.claude/`, `.mcp.json`.
- **카피 중립화 깊이**: Header/Footer 골격은 남기되 네비 항목은 도메인 B 의 IA 가 정해질 때까지 비운다(MVP 가 운영자 전용 화면을 안 만들면 네비 자체가 필요 없다). page.tsx 는 "초기화 완료 + 다음 단계 안내" 수준 플레이스홀더.
- **CLAUDE.md 재작성**: 도메인 A 전제로 깔린 모든 섹션 갱신 필요(프로젝트 정체성, 도메인 모델, 정합성 규칙, 아키텍처, 진행 상태). 함정 노트와 테스트 정책은 거의 그대로 살아남는다.
- **검증 순서**: `npm run lint` → `npm run build` → `npm run dev` 부팅(200 OK 확인). 의존성 변경이 없으므로 `npm install` 불필요.

이번 케이스에서 들어낸 파일 수: app 라우트 6개 + lib/notion.ts 1개 + 문서 4개 아카이브 + 카피 갱신 6개. 빌드/린트 무파손 검증 통과.

관련: [[project-identity]], [[starter-kit-bloat-patterns]]
