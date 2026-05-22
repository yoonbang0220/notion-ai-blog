---
name: heuristic-admin-list-breaks-url-secrecy
description: "URL이 비밀"인 비로그인 공유 서비스에 관리자 목록 화면을 추가하면 전체 URL이 한 곳에 모여 보안 모델이 붕괴 — 인증 게이트가 목록보다 선행 P0
metadata:
  type: feedback
---

비로그인 공유 링크 서비스(보안 모델 = "추측 불가 URL 자체가 비밀", [[heuristic-url-security-mvp]])에 **운영자용 견적/콘텐츠 목록 화면**을 추가할 때, 그 목록 페이지는 **모든 공유 URL을 한 곳에 모아 노출**한다. 인증 없이 공개되면 단 한 번의 접근으로 전체 URL이 통째로 유출 → MVP 보안 모델 전체가 붕괴한다.

**Why:** "URL이 비밀"인 모델에서는 링크 하나가 새도 그 견적 하나만 노출되지만, 목록 페이지는 N개를 동시에 집약한다. 공격면이 1건→전체로 폭증.

**How to apply:**
- 관리자 목록/대시보드를 추가하는 순간 **인증(로그인) 게이트를 그 기능군의 P0 최우선**으로 올린다. "인증이 목록 UI보다 먼저 성립해야 한다"고 명시.
- 단일 운영자 MVP에는 **신규 npm install 없는 경량안**을 권장: 환경변수 비밀번호(`ADMIN_PASSWORD`) + Web Crypto HMAC 서명 세션 쿠키(`httpOnly+secure+sameSite=lax`) + `proxy.ts`에서 `/admin/*` 게이팅. 대안으로 HTTP Basic Auth, Vercel 플랫폼 보호를 표로 제시하고 운영자 결정 항목으로 등록.
- 인증은 proxy 낙관적 게이트 + 서버 컴포넌트 재검증 2중. 관리자 라우트도 `noindex`(proxy 헤더 + robots Disallow).
- Next.js(App Router): `proxy.ts`에서 `cookies()`(await) 읽어 검증, route handler/server action에서 쿠키 set. 외부 인증 라이브러리 불필요.
