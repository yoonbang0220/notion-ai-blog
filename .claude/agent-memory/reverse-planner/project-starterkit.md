---
name: project-starterkit
description: StarterKit 프로젝트 개요 — nextjs-shadcn-starter의 목적, 구현된 페이지, 미구현 페이지 목록
metadata:
  type: project
---

StarterKit은 웹 서비스 개발 출발점(템플릿) 프로젝트로, 반복 설정 없이 비즈니스 로직 개발에 집중할 수 있도록 기본 구조를 미리 완성해 둔 것입니다.

**구현 완료 페이지**: 홈(/), 로그인(/login), 회원가입(/signup), 대시보드 개요(/dashboard), 404 오류 페이지

**화면 구조만 있고 로직 미연결**: 로그인·회원가입 폼은 UI만 존재하며 실제 서버 통신(인증) 로직이 없음

**메뉴는 있으나 페이지 미구현**: /dashboard/analytics, /dashboard/users, /dashboard/posts, /dashboard/settings, /forgot-password, /terms, /privacy, /contact

**Why:** 스타터킷 특성상 기본 틀만 제공하고 실제 비즈니스 로직은 사용자가 직접 채우도록 의도된 설계

**How to apply:** 기능 추가 요청 시 이미 구현된 것과 미구현 항목을 구분하여 작업 범위를 정확히 파악할 것. 인증 기능 요청 시 NextAuth.js 연동 방향을 우선 제안.

관련 메모리: [[tech-terms-korean]], [[documented-features]]
