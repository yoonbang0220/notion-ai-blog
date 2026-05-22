"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { login, type LoginState } from "./actions"

/**
 * 관리자 로그인 폼(클라이언트 컴포넌트, T3.1).
 *
 * Next.js 16 권장 패턴: `<form action={action}>` + `useActionState`(authentication 가이드).
 * 제출 → {@link login} Server Action → 성공 시 서버에서 `/admin` redirect, 실패 시
 * 인라인 에러("비밀번호가 올바르지 않습니다.") 노출. 색은 토큰만 사용(하드코딩 0).
 *
 * shadcn(@base-ui/react) 재사용: Field/FieldLabel/FieldError/Input/Button.
 */
export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <Field data-invalid={state.error ? true : undefined}>
          <FieldLabel htmlFor="admin-password">비밀번호</FieldLabel>
          <Input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "admin-password-error" : undefined}
          />
          {state.error ? (
            <FieldError id="admin-password-error">
              {state.error}
            </FieldError>
          ) : (
            <FieldDescription>
              운영자 비밀번호를 입력하면 견적 목록에 접근할 수 있습니다.
            </FieldDescription>
          )}
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? "확인 중…" : "로그인"}
        </Button>
      </FieldGroup>
    </form>
  )
}
