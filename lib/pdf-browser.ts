/**
 * 헤드리스 Chromium launch 환경 분기 헬퍼.
 *
 * `/q/[slug]/pdf` 라우트(T2.3)와 스파이크(`scripts/test/pdf-spike.ts`)가 **공유**한다.
 * 핵심은 "로컬(Windows/macOS/Linux) vs 서버리스(Vercel/AWS Lambda)" launch 옵션 분기다.
 *   - 로컬: 시스템에 설치된 Chrome/Edge 의 executablePath 를 직접 지정 + `headless: true`.
 *   - 서버리스: `@sparticuz/chromium` 의 args/executablePath + `headless: "shell"`.
 *
 * ⚠️ **`server-only` 를 import 하지 않는다.** 이 헬퍼는 Notion 토큰 등 비밀을 다루지 않고,
 *    스파이크가 순수 Node(`tsx`)에서 직접 import 해 검증할 수 있어야 한다(가드가 throw 함).
 *
 * ⚠️ **`@sparticuz/chromium@148` 에는 정적 `headless` 프로퍼티가 없다**(구버전과 다름).
 *    `chromium.headless` 를 쓰면 TS2339. 서버리스에서는 `"shell"` 헤드리스 모드를 직접 지정한다
 *    (README 권장 경량 모드).
 */

import { existsSync } from "node:fs"

import chromium from "@sparticuz/chromium"
import type puppeteer from "puppeteer-core"

/** puppeteer-core `launch()` 옵션 타입(버전 독립적으로 추론). */
export type LaunchOptions = Parameters<typeof puppeteer.launch>[0]

/** 서버리스(Vercel/AWS Lambda) 실행 환경 여부. */
export function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

/**
 * 로컬 시스템에 설치된 Chrome/Edge 의 실행 파일 경로를 찾는다.
 * 1순위는 플랫폼 표준 Chrome 경로. 없으면 Edge 까지 폴백한다.
 * 후보를 모두 못 찾으면 명확한 메시지로 throw 한다.
 */
export function findLocalBrowserPath(): string {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
          ]

  const found = candidates.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      `로컬 Chrome/Edge 실행 파일을 찾지 못했습니다. 확인 후보:\n  ${candidates.join("\n  ")}`,
    )
  }
  return found
}

/**
 * 환경에 맞는 puppeteer launch 옵션을 구성한다.
 * - 서버리스: `@sparticuz/chromium` 의 args/executablePath + `headless: "shell"`.
 * - 로컬: 시스템 Chrome 경로 + `headless: true` + 표준 sandbox 비활성 args.
 */
export async function buildLaunchOptions(): Promise<LaunchOptions> {
  if (isServerless()) {
    return {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: "shell",
    }
  }
  // ⚠️ `--no-sandbox` 는 Chrome 샌드박스를 끈다 — Docker/루트 컨테이너(주로 Linux)에서만
  //    필요하다. macOS/Windows 로컬에선 불필요하며 끄면 헤드리스 페이지의 공격이 호스트
  //    프로세스에 직접 닿을 수 있다(M4 리뷰 반영: Defense in Depth). 따라서 Linux 로컬에서만 적용.
  return {
    args:
      process.platform === "linux"
        ? ["--no-sandbox", "--disable-setuid-sandbox"]
        : [],
    executablePath: findLocalBrowserPath(),
    headless: true,
  }
}
