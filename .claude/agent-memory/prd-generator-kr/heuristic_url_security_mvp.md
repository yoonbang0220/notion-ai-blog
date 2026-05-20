---
name: heuristic-url-security-mvp
description: 비로그인 공유 링크형 서비스의 보안 최소선 — 추측 불가 slug(32자+) + noindex + robots Disallow. 비밀번호·만료차단은 Future.
metadata:
  type: feedback
---

비로그인 공유 링크형 MVP(견적서·초대장·청구서·계약서 등)의 보안 최소선은 다음 3개를 P0로 묶어 명시한다:
1. **추측 불가 slug** — `nanoid(32)` 이상 또는 32자 hex. URL 자체가 비밀 키.
2. **검색엔진 인덱싱 차단** — `X-Robots-Tag: noindex, nofollow` 응답 헤더 + `robots.txt` Disallow.
3. **서버 전용 토큰 가드** — Notion/API 토큰은 `server-only` import + `NEXT_PUBLIC_` 접두 금지.

비밀번호 보호·만료 후 410 차단·열람 IP 화이트리스트·열람 알림은 거의 항상 Future로 분리한다.

**Why:** 사용자 페르소나(특히 디지털 숙련도 낮은 클라이언트)에게 비밀번호를 추가로 요구하면 "왜 또 복잡하게 하냐"는 즉각적 마찰이 생긴다. URL 자체가 비밀 키 역할을 하면 1차 보안은 성립하고, MVP는 이 가정으로 Goal(받자마자 즉시 열어본다)을 검증하는 데 집중해야 한다. 만료 차단은 사내 결재 흐름과 충돌할 수 있어 운영자가 직접 정책 결정한 뒤 추가하는 게 안전하다.

**How to apply:**
- 사용자가 "비밀번호 보호도 추가할까요?" 라고 물으면 "MVP는 추측 불가 URL + noindex 로 1차 보안. 비밀번호는 Future로 분리하시는 게 빠른 검증에 유리합니다" 라고 응답하고, 운영자가 명시적으로 P0 격상을 요청할 때만 포함한다.
- 만료 후 정책은 "열람 허용 + 배너 표시" 를 디폴트, "410 차단" 을 옵션으로 PRD 끝의 열린 질문에 명시.
- 관련: [[project-repo-context]]
