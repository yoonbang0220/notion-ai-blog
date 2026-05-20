---
name: base-ui-components
description: shadcn/ui(@base-ui/react) 컴포넌트의 실제 props·파일 위치·렌더 패턴 (견적서 UI 작업용)
metadata:
  type: reference
---

shadcn/ui 는 `@base-ui/react` 기반(Radix 아님). props 는 항상 `components/ui/<name>.tsx` 실제 파일에서 확인.

- `components/ui/button.tsx` — `@base-ui/react/button` 래퍼. CVA variants: `default/outline/secondary/ghost/destructive/link`, size `default/xs/sm/lg/icon*`.
  - **링크 버튼**: `<Button render={<a href={...} />} nativeButton={false} ...>`. `render` 는 `ReactElement` 를 받아 엘리먼트 교체(asChild 아님). 비-button 엘리먼트로 렌더할 땐 `nativeButton={false}` 명시(없으면 시맨틱 어긋남). 출처: `node_modules/@base-ui/react/internals/types.d.ts` 의 `BaseUIComponentProps.render` + `NativeButtonProps.nativeButton`.
- `components/ui/card.tsx` — 순수 div 래퍼(서버 컴포넌트). 그림자 대신 `ring-1 ring-foreground/10` + `rounded-xl` (인쇄 친화). 슬롯: Card/CardHeader/CardTitle/CardContent/CardFooter/CardAction/CardDescription. CardHeader 는 grid(`has-data-[slot=card-action]:grid-cols-[1fr_auto]`). CardFooter 는 `bg-muted/50 border-t`.
- `components/ui/separator.tsx` — `"use client"`(@base-ui primitive). `bg-border`, horizontal=h-px. 서버 컴포넌트(QuoteView) 안에서 자식으로 사용해도 됨(클라이언트 경계 자동).
- **table 컴포넌트는 없음** → 네이티브 `<table>` + `<th scope="col">` 직접 작성.
- `cn()` = `@/lib/utils`(clsx+tailwind-merge). 타입 import 는 `@/types`(= `types/index.ts`).

연관: [[responsive-table-card]] [[token-usage]]
