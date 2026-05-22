"use server"

import { redirect } from "next/navigation"

import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/admin-auth"

/**
 * 로그인 Server Action — `app/admin/login/login-form.tsx`(`useActionState`) 가 사용.
 *
 * Next.js 16 권장 인증 패턴(authentication 가이드 §Authentication): `<form action={...}>`
 * + Server Action. Server Action 은 항상 서버에서 실행돼 비밀번호 비교를 안전하게 수행한다.
 *
 * 흐름:
 *   1. FormData 에서 비밀번호 추출. 빈 값이면 에러 반환(쿠키 미발급).
 *   2. `verifyPassword`(타이밍 안전) 비교 → 불일치면 인라인 에러 반환(쿠키 미발급).
 *   3. 일치하면 세션 토큰 발급 → 쿠키 set → `/admin` 으로 redirect.
 *
 * ⚠️ `redirect()` 는 내부적으로 throw 하므로 반드시 try/catch **밖**에서 호출한다
 *   (authentication/redirect 문서 권고). 여기선 try 자체를 쓰지 않는다.
 */

/** useActionState 상태 형태(에러 메시지만). 성공 시 redirect 라 상태 반환 없음. */
export interface LoginState {
  error?: string
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password")
  if (typeof password !== "string" || password.length === 0) {
    return { error: "비밀번호를 입력해 주세요." }
  }

  // 타이밍 안전 비교 — 불일치 시 어떤 견적 정보도 응답에 포함하지 않는다(R 보안).
  if (!verifyPassword(password)) {
    return { error: "비밀번호가 올바르지 않습니다." }
  }

  const token = await createSessionToken()
  await setSessionCookie(token)

  // 성공 — /admin 으로 이동(throw 라 이 줄 이후 코드는 실행되지 않음).
  redirect("/admin")
}
