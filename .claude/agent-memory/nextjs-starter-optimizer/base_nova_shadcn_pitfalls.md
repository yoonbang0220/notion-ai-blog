---
name: base-nova-shadcn-pitfalls
description: shadcn base-nova 스타일은 @base-ui/react 기반이며 Field/Label/Separator 의존 그래프가 묶여 있다
metadata:
  type: feedback
---

이 프로젝트의 shadcn/ui 는 `style: "base-nova"` (components.json) 로, 기본 shadcn 의 Radix 대신 `@base-ui/react` 를 감싼다. 컴포넌트 API 가 일반적인 shadcn 과 달라서 학습 데이터 기반 추측이 자주 빗나간다.

**Why:** base-nova 는 새로 등장한 스타일이라 LLM 학습 데이터에 거의 반영돼 있지 않다. 또한 base-nova 의 `field.tsx` 는 내부적으로 `label.tsx` + `separator.tsx` 에 의존하므로 "안 쓰는 것 같다"고 함부로 지우면 폼 빌딩 블록이 깨진다.

**How to apply:**
- 컴포넌트 API 확인은 항상 `components/ui/*.tsx` 실제 파일을 읽고 결정한다. 추측 금지.
- `field` / `label` / `separator` 는 import 그래프상 묶음이다. `field` 가 살아있다면 `label` 과 `separator` 도 함께 유지해야 한다.
- 폼 빌딩 컨벤션: `<FieldGroup>` → `<Field>` → `<FieldLabel>` + `<Input>` 조합. 일반 `<Label>` 직접 사용보다 이쪽이 base-nova 의 정공법이다.
- 미사용으로 안전 제거 가능했던 컴포넌트(이 정리 작업 기준): `dialog`, `dropdown-menu`. grep 으로 0건 확인 후 제거함.
- shadcn 컴포넌트 추가는 `npx shadcn@latest add <name>` — `components.json` 의 `style` 이 `base-nova` 이므로 자동으로 같은 스타일이 적용됨.
- 관련: [[project-identity]]
