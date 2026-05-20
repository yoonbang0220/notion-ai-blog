---
name: responsive-table-card
description: 견적서 반응형(table↔card) 전환·다크모드 토큰·만료/누락 배너에서 검증된 Tailwind v4 결정
metadata:
  type: reference
---

## 반응형 table↔card (640px 기준, sm:)
- 같은 데이터를 **두 마크업으로 렌더**: `<table className="hidden ... sm:table">` + `<ul className="space-y-3 sm:hidden">`.
- 375px 실측: `documentElement.scrollWidth(360) <= innerWidth(375)` → 가로 스크롤 0. table 은 `display:none`, ul li 카드 노출 확인됨.
- 모바일 카드 1행 = 항목명(굵게) + `수량 × 단가`(좌) ↔ `금액`(우, font-semibold). `flex justify-between` 로 정렬.
- 금액·수량 우측정렬 + `tabular-nums`(자릿수 정렬) 필수. 금액 포맷: `new Intl.NumberFormat("ko-KR").format(n) + "원"` → `2,090,000원`.

## 다크모드 토큰 (globals.css :root/.dark, oklch) — 색 하드코딩 금지
- 본문: `bg-card`/`text-card-foreground`, 라벨 `text-muted-foreground`, 값 `text-foreground`, 구획선 `border-border`(또는 `border-border/60`).
- 라이트·다크 양쪽 실측 OK(Card 흰/검 배경, 텍스트 명암비 충분). Card 의 `ring-foreground/10` 이 다크에서도 은은히 보임.

## 정합성 배너 (전용 warning 토큰 없음)
- 만료(규칙7): `role="alert"` + `border-destructive/50 bg-destructive/10 text-destructive`. 라이트에서 연한 빨강 OK.
- 항목 경고(규칙4): `role="status"` + `border-destructive/50 text-destructive`.
- 필수정보 누락(규칙2, "노란/주의"): **전용 yellow 토큰이 없어** `bg-muted text-foreground border-border` 로 표현(보고됨, 새 색 변수 만들지 않음). 진짜 노란 배너가 필요하면 사용자에게 토큰 추가 보고.

## 인쇄/PDF 친화 (W2 대비)
- 과한 그림자 대신 Card 의 ring 사용. position fixed·vh 고정 안 씀.
- 버튼/배너에 `data-print-hide="true"`, article 에 `data-print-region="quote"` 마크업만 심어둠(실제 ?print=1 분기 동작은 T2.3).

연관: [[base-ui-components]]
