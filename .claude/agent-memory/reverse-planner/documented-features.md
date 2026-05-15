---
name: documented-features
description: 역기획서로 문서화된 기능 목록과 파일 경로 추적
metadata:
  type: project
---

## 문서화된 기획서 목록

| 기능명 | 기획서 파일 경로 | 작성일 |
|--------|----------------|--------|
| 전체 프로젝트 역기획서 | /PRODUCT_SPEC.md | 2026-05-14 |
| Claude Code Hooks + Slack 알림 시스템 | /docs/HOOKS_PLANNING.md | 2026-05-15 |

## 문서화 범위 (PRODUCT_SPEC.md)

전체 프로젝트를 대상으로 한 종합 역기획서입니다. 포함 섹션:
1. 프로젝트 개요 (목적, 타깃, 핵심 가치)
2. 서비스 구조 (페이지 목록 13개, 레이아웃 계층)
3. 주요 기능 명세 (홈, 로그인, 회원가입, 대시보드, 다크모드, Toast, 404)
4. 컴포넌트 설계 (공통 5개 + UI 5개, 관계도)
5. 데이터 모델 (User, ApiResponse, PaginatedResponse, ThemeMode)
6. UI/UX 설계 원칙 (색상, 레이아웃, 반응형, 폰트, 인터랙션)
7. 기술적 결정 사항 (각 기술 선택 이유)
8. 예외 처리 (페이지 단위 + 컴포넌트 접근성)
9. 향후 개선 방향 (즉시 필요 4개 + 확장 가능성 8개)
10. 기술 용어 사전 (20개 용어)

**Why:** 프로젝트 전체 파악을 위한 최초 문서화 요청

**How to apply:** 개별 기능 기획서 추가 시 이 목록에 항목을 추가하여 추적할 것

관련 메모리: [[project-starterkit]], [[tech-terms-korean]]

## HOOKS_PLANNING.md 요약 (2026-05-15)

Claude Code Hooks와 Slack Webhook을 연결하는 자동화 알림 시스템 기획서.
- 이벤트 5종: permission, stop, subagent_start, subagent_running, subagent_stop
- 마커 파일 패턴으로 메인/서브에이전트 구분 (스팸 방지 핵심 설계)
- macOS(bash+python3) + Windows(PowerShell) 크로스플랫폼 지원
- BUG-001 수정 완료, BUG-002/003 보류, Rate Limit 미구현 상태
