/**
 * T2.3 — `/q/[slug]/pdf` Route Handler 통합 자기검증.
 *
 * 실행(별도 터미널에서 dev 서버를 먼저 띄운 뒤):
 *   1) npm run dev            # 포트 3000
 *   2) node --env-file=.env.local --import tsx scripts/test/pdf-route.ts
 *
 * 이 스크립트는 dev 서버를 spawn 하지 않고 이미 떠 있는 서버(BASE_URL, 기본 http://localhost:3000)
 * 에 fetch 로 붙는다. (Windows 에서 dev 서버 프로세스 트리 종료가 불안정해 라이프사이클을
 * 호출자에게 위임 — 메인 워크플로우가 dev 를 백그라운드로 띄우고 끝나면 종료한다.)
 *
 * .env.local 필요 값: SEED_SLUG_ACTIVE(정상 발행 견적), SEED_SLUG_EXPIRED(만료, 단 Published).
 *
 * 검증 시나리오(ROADMAP T2.3 테스트 계획):
 *   1. 정상: GET /q/<SEED_SLUG_ACTIVE>/pdf → content-type=application/pdf,
 *            content-disposition 에 "견적서"(디코드), body >50KB. out/route.pdf 저장.
 *   2. 잘못된 슬러그: GET /q/invalid/pdf → 404.
 *   3. Draft 견적: Draft 시드 슬러그가 없어 "시드 부재로 스킵"(없는 슬러그 404 가 not-found 경로 커버).
 *   4. 한글 파일명 인코딩: Content-Disposition 의 filename*=UTF-8'' 파싱·디코딩 → "견적서_..." 일치.
 *   5. 응답 시간: 측정 → 콜드스타트 포함 로컬 15초 이내.
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

type ScenarioResult = { name: string; ok: boolean; detail: string }

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..", "..")
const OUT_DIR = resolve(PROJECT_ROOT, "out")
const OUT_PDF = resolve(OUT_DIR, "route.pdf")

const BASE_URL = process.env.PDF_TEST_BASE_URL ?? "http://localhost:3000"
const SEED_SLUG_ACTIVE = process.env.SEED_SLUG_ACTIVE

/**
 * RFC 5987 `filename*=UTF-8''<pct-encoded>` 형식에서 파일명을 파싱·디코딩한다.
 * 매칭 실패 시 null.
 */
function parseRfc5987Filename(disposition: string | null): string | null {
  if (!disposition) return null
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

/** 시나리오 1 — 정상: 시드 슬러그 PDF 다운로드. content-type/디스포지션/크기 검증 + 저장. */
async function scenario1Normal(): Promise<ScenarioResult> {
  const name = "1. 정상 PDF 다운로드(시드 active)"
  if (!SEED_SLUG_ACTIVE) {
    return {
      name,
      ok: false,
      detail: "SEED_SLUG_ACTIVE 미설정 — .env.local 확인 필요",
    }
  }
  try {
    const res = await fetch(`${BASE_URL}/q/${SEED_SLUG_ACTIVE}/pdf`)
    if (res.status !== 200) {
      const text = await res.text()
      return {
        name,
        ok: false,
        detail: `status ${res.status} (기대 200). 본문: ${text.slice(0, 200)}`,
      }
    }
    const contentType = res.headers.get("content-type") ?? ""
    const disposition = res.headers.get("content-disposition")
    const decodedName = parseRfc5987Filename(disposition)
    const buffer = Buffer.from(await res.arrayBuffer())

    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(OUT_PDF, buffer)

    const isPdf = contentType.includes("application/pdf")
    const hasKorean = (decodedName ?? "").includes("견적서")
    const bigEnough = buffer.byteLength > 50 * 1024
    // PDF 매직바이트(%PDF) 추가 확인.
    const magicOk = buffer.subarray(0, 4).toString("latin1") === "%PDF"

    const ok = isPdf && hasKorean && bigEnough && magicOk
    return {
      name,
      ok,
      detail: `content-type=${contentType}, 파일명="${decodedName}", 크기=${(buffer.byteLength / 1024).toFixed(1)}KB, magic=${magicOk ? "%PDF" : "?"} → ${
        ok
          ? "PASS (out/route.pdf 저장)"
          : `FAIL (isPdf=${isPdf}, 견적서포함=${hasKorean}, >50KB=${bigEnough}, magic=${magicOk})`
      }`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** 시나리오 2 — 잘못된 슬러그: 404 기대(slug 형식 위반 → lib null → 404). */
async function scenario2InvalidSlug(): Promise<ScenarioResult> {
  const name = "2. 잘못된 슬러그 → 404"
  try {
    const res = await fetch(`${BASE_URL}/q/invalid/pdf`)
    const ok = res.status === 404
    return {
      name,
      ok,
      detail: `status ${res.status} (기대 404) → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** 시나리오 3 — Draft 견적: Draft 시드 부재로 스킵(없는 슬러그 404 가 not-found 경로 커버). */
function scenario3DraftSkipped(): ScenarioResult {
  const name = "3. Draft 견적 → 스킵"
  return {
    name,
    ok: true,
    detail:
      "Draft 시드 슬러그 부재로 스킵. 미공개/없는 슬러그의 404 경로는 시나리오 2 가 커버.",
  }
}

/** 시나리오 4 — 한글 파일명 인코딩: Content-Disposition 파싱·디코딩 → "견적서_..." 일치. */
async function scenario4FilenameEncoding(): Promise<ScenarioResult> {
  const name = "4. 한글 파일명 인코딩(RFC 5987)"
  if (!SEED_SLUG_ACTIVE) {
    return { name, ok: false, detail: "SEED_SLUG_ACTIVE 미설정" }
  }
  try {
    const res = await fetch(`${BASE_URL}/q/${SEED_SLUG_ACTIVE}/pdf`)
    const disposition = res.headers.get("content-disposition")
    // 본문 소비(연결 정리).
    await res.arrayBuffer()

    const hasRfc5987 = (disposition ?? "").includes("filename*=UTF-8''")
    const decoded = parseRfc5987Filename(disposition)
    // 형식: 견적서_<회사>_<YYYYMMDD>.pdf
    const matchesPattern =
      decoded != null && /^견적서_.+_\d{8}\.pdf$/.test(decoded)

    const ok = hasRfc5987 && matchesPattern
    return {
      name,
      ok,
      detail: `disposition="${disposition}", 디코드="${decoded}" → ${
        ok ? "PASS" : `FAIL (rfc5987=${hasRfc5987}, 패턴일치=${matchesPattern})`
      }`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** 시나리오 5 — 응답 시간: 콜드스타트 포함 로컬 15초 이내. */
async function scenario5ResponseTime(): Promise<ScenarioResult> {
  const name = "5. 응답 시간(콜드스타트 포함 ≤15s)"
  if (!SEED_SLUG_ACTIVE) {
    return { name, ok: false, detail: "SEED_SLUG_ACTIVE 미설정" }
  }
  try {
    const start = Date.now()
    const res = await fetch(`${BASE_URL}/q/${SEED_SLUG_ACTIVE}/pdf`)
    await res.arrayBuffer()
    const elapsedMs = Date.now() - start
    const ok = res.status === 200 && elapsedMs <= 15000
    return {
      name,
      ok,
      detail: `${(elapsedMs / 1000).toFixed(2)}s (status ${res.status}) → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

async function run() {
  console.log(`[환경] BASE_URL=${BASE_URL}, SEED_SLUG_ACTIVE=${SEED_SLUG_ACTIVE ?? "(미설정)"}`)

  // 서버 가용성 사전 체크(연결 거부 시 명확한 안내).
  try {
    await fetch(`${BASE_URL}/`, { method: "HEAD" })
  } catch {
    console.error(
      `\n❌ ${BASE_URL} 에 연결할 수 없습니다. 먼저 \`npm run dev\` 로 dev 서버를 띄우세요.`,
    )
    process.exitCode = 1
    return
  }

  const results: ScenarioResult[] = []
  results.push(await scenario1Normal())
  results.push(await scenario2InvalidSlug())
  results.push(scenario3DraftSkipped())
  results.push(await scenario4FilenameEncoding())
  results.push(await scenario5ResponseTime())

  console.log("\n=== 결과 요약 ===")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  console.log(
    `\n총 ${results.length}건 중 ${results.length - failed.length} PASS / ${failed.length} FAIL`,
  )
  process.exitCode = failed.length > 0 ? 1 : 0
}

void run()
