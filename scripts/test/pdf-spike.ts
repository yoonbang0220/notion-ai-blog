/**
 * T2.1 PDF 생성 스파이크 — puppeteer-core + @sparticuz/chromium 동작 검증.
 *
 * 실행:
 *   node --import tsx scripts/test/pdf-spike.ts
 *   (env 불필요 — Notion 페치 없음)
 *
 * 목적:
 *   W2 의 /q/[slug]/pdf 라우트(T2.3)가 사용할 헤드리스 Chromium 인쇄 파이프라인을
 *   단독으로 검증한다. 핵심인 "로컬(Windows) vs 서버리스(Vercel/Lambda)" 환경 분기는
 *   라우트와 공유하는 lib 헬퍼(`@/lib/pdf-browser`)로 추출돼 있다(T2.3 에서 추출).
 *     - 로컬: 시스템에 설치된 Chrome 의 executablePath 를 직접 지정.
 *     - 서버리스: @sparticuz/chromium 이 제공하는 args/executablePath + headless:"shell".
 *
 * 호환성 메모:
 *   @sparticuz/chromium@148 의 검증 짝은 puppeteer-core@24.x (패키지 devDependency 기준).
 *   puppeteer-core 25.x 는 매트릭스 밖이라 24.x 로 핀해 설치돼 있다.
 *
 * 검증 시나리오(ROADMAP T2.1 테스트 계획):
 *   1. 정상: https://example.com → page.pdf({format:"A4"}) → out/spike.pdf (>1KB)
 *   2. 실패(잘못된 URL): https://nonexistent.invalid {timeout:5000} → catch 후 명확한 에러 메시지
 *   3. 엣지(메모리): process.memoryUsage() 출력 → Vercel 1024MB 한계 대비 여유 확인
 */

import { existsSync, mkdirSync, statSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import puppeteer, { type Browser } from "puppeteer-core"

// ⚠️ 환경 분기 로직은 라우트(app/q/[slug]/pdf/route.ts)와 공유하는 lib 헬퍼로 추출됐다.
//    이 헬퍼는 server-only 를 import 하지 않으므로 tsx 에서 직접 import 가능하다.
import {
  buildLaunchOptions,
  findLocalBrowserPath,
  isServerless,
} from "@/lib/pdf-browser"

type ScenarioResult = { name: string; ok: boolean; detail: string }

// 스크립트 파일 기준 프로젝트 루트(scripts/test/ → ../../).
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..", "..")
// 생성 PDF 출력 경로. /out 은 .gitignore 에 이미 포함돼 바이너리 커밋이 방지된다.
const OUT_DIR = resolve(PROJECT_ROOT, "out")
const OUT_PDF = resolve(OUT_DIR, "spike.pdf")

/** 시나리오 1 — 정상: example.com 을 A4 PDF 로 추출해 out/spike.pdf 저장. */
async function scenario1NormalPdf(): Promise<ScenarioResult> {
  const name = "1. 정상 PDF 추출(example.com → A4)"
  let browser: Browser | undefined
  try {
    if (!existsSync(OUT_DIR)) {
      mkdirSync(OUT_DIR, { recursive: true })
    }
    browser = await puppeteer.launch(await buildLaunchOptions())
    const page = await browser.newPage()
    await page.goto("https://example.com", { waitUntil: "networkidle0" })
    const buffer = await page.pdf({ format: "A4", path: OUT_PDF })
    console.log("size:", buffer.length)

    const fileSize = statSync(OUT_PDF).size
    const ok = fileSize > 1024
    return {
      name,
      ok,
      detail: ok
        ? `out/spike.pdf 생성 ${fileSize}B (>1KB), buffer ${buffer.length}B`
        : `PDF 크기 부족: ${fileSize}B (1KB 이하)`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  } finally {
    await browser?.close()
  }
}

/** 시나리오 2 — 실패: 존재하지 않는 호스트 접속 시 타임아웃/네트워크 에러를 명확히 보고. */
async function scenario2InvalidUrl(): Promise<ScenarioResult> {
  const name = "2. 실패 경로(잘못된 URL → 타임아웃)"
  let browser: Browser | undefined
  try {
    browser = await puppeteer.launch(await buildLaunchOptions())
    const page = await browser.newPage()
    await page.goto("https://nonexistent.invalid", { timeout: 5000 })
    // 여기 도달하면 비정상(에러가 안 났다는 뜻) → 실패로 간주.
    return {
      name,
      ok: false,
      detail: "예상과 달리 잘못된 URL 접속이 성공했다(에러 미발생).",
    }
  } catch (error) {
    const message = (error as Error).message
    // 네트워크 해석 실패 또는 타임아웃 메시지를 정상 처리(catch 동작 확인).
    const handled =
      message.includes("ERR_NAME_NOT_RESOLVED") ||
      message.includes("net::") ||
      message.toLowerCase().includes("timeout") ||
      message.toLowerCase().includes("navigation")
    return {
      name,
      ok: handled,
      detail: handled
        ? `에러를 정상 catch: ${message.split("\n")[0]}`
        : `예상 밖 에러: ${message.split("\n")[0]}`,
    }
  } finally {
    await browser?.close()
  }
}

/** 시나리오 3 — 엣지: 프로세스 메모리 사용량을 Vercel 1024MB 한계와 비교. */
function scenario3Memory(): ScenarioResult {
  const name = "3. 엣지(메모리 사용량 vs 1024MB)"
  const usage = process.memoryUsage()
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10
  const rssMB = toMB(usage.rss)
  const heapUsedMB = toMB(usage.heapUsed)
  console.log(
    `memoryUsage → rss: ${rssMB}MB, heapUsed: ${heapUsedMB}MB, heapTotal: ${toMB(usage.heapTotal)}MB`,
  )
  // RSS 가 Vercel 1024MB 한계의 절반 미만이면 여유 충분으로 판단.
  const ok = rssMB < 512
  return {
    name,
    ok,
    detail: `rss ${rssMB}MB / 1024MB 한계 — ${ok ? "여유 충분" : "여유 부족(확인 필요)"}`,
  }
}

async function run() {
  console.log(
    `[환경] platform=${process.platform}, serverless=${isServerless()}`,
  )
  if (!isServerless()) {
    try {
      console.log(`[환경] 로컬 브라우저: ${findLocalBrowserPath()}`)
    } catch (error) {
      console.log(`[환경] 로컬 브라우저 탐색 경고: ${(error as Error).message}`)
    }
  }

  const results: ScenarioResult[] = []
  results.push(await scenario1NormalPdf())
  results.push(await scenario2InvalidUrl())
  results.push(scenario3Memory())

  console.log("\n=== 결과 요약 ===")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  process.exitCode = failed.length > 0 ? 1 : 0
}

void run()
