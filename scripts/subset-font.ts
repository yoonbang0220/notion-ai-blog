/**
 * Pretendard 변수 폰트 서브셋 스크립트(T2.7).
 *
 * `public/fonts/PretendardVariable.woff2`(약 2MB)를 견적서/랜딩에서 실제로 쓰는 글리프
 * 집합으로만 줄여 네트워크 전송량을 낮춘다. **변수 weight 축은 유지**(variationAxes 미지정)
 * 하므로 `next/font/local` 의 `weight: "45 920"` 배선을 그대로 둔다.
 *
 * retain 글리프 집합:
 *   - ASCII 전체(U+0020–U+007E) + Latin-1 보충(U+00A0–U+00FF) — 영문/숫자/기본 기호.
 *   - **KS X 1001 완성형 한글 2350자** — 현대 한국어 텍스트의 99%+ 를 커버하는 상용 한글.
 *     EUC-KR 0xB0A1~0xC8FE 영역(행 0xB0~0xC8 × 열 0xA1~0xFE)을 `TextDecoder('euc-kr')`
 *     로 디코딩해 정확히 생성한다(외부 데이터 의존 없이 코드로 검증 가능).
 *     ⚠️ 음절 전체(11172자)는 ~1714KB(14.7% 감소)에 그쳐 목표 미달이라 상용 2350자 채택.
 *        측정: ASCII+기호만 58.7KB / +음절전체 1714KB / +KSX2350 452KB.
 *     ⚠️ 트레이드오프 — 회사명·고유명사에 드물게 비상용 음절(예: 쀼·똠)이 오면 폴백 폰트로
 *        렌더된다(□ 두부 아님, display 폰트 폴백). 운영 중 누락 발견 시 음절 전체로 회귀 가능.
 *   - 한글 자모(U+3130–U+318F) — 단독 자모 표기 대비.
 *   - CJK 기호·문장부호(U+3000–U+303F) — 「」『』·… 등.
 *   - 자주 쓰는 일반 문장부호/통화·수학 기호(₩ ※ ○ ● ▶ → ± × ÷ ‘’ “” – — 등).
 *
 * 실행(원본 폰트가 있어야 함 — 아래 ⚠️ 참고):
 *   node --import tsx scripts/subset-font.ts
 *
 * ⚠️ **원본 폰트(`PretendardVariable.woff2`, 2MB)는 T2.7 에서 저장소에서 제거됐다**
 *    (서브셋 452KB 로 대체). 재서브셋(예: 음절 전체로 회귀)이 필요하면 npm CDN 에서
 *    원본을 먼저 다시 받아 `public/fonts/PretendardVariable.woff2` 로 둔다:
 *      https://cdn.jsdelivr.net/npm/pretendard@latest/dist/web/variable/woff2/PretendardVariable.woff2
 *    (jsDelivr 의 gh 엔드포인트는 "Package size exceeded 50MB" 로 실패하므로 npm 경로 사용.)
 *
 * 출력:
 *   public/fonts/PretendardVariable.subset.woff2 (새 파일)
 *   → before/after 바이트 크기를 콘솔에 출력. layout.tsx 의 src 를 이 파일로 교체 후 한글 실측.
 *
 * ⚠️ 서브셋 후 반드시 Playwright 로 견적/랜딩 한글 렌더 실측. 글리프 누락 시 ship 금지.
 */

import { readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import subsetFont from "subset-font"

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..")
const FONTS_DIR = resolve(PROJECT_ROOT, "public", "fonts")
const SRC = resolve(FONTS_DIR, "PretendardVariable.woff2")
const OUT = resolve(FONTS_DIR, "PretendardVariable.subset.woff2")

/** 시작~끝(포함) 코드포인트 범위의 문자열을 만든다. */
function range(start: number, end: number): string {
  let s = ""
  for (let cp = start; cp <= end; cp++) s += String.fromCodePoint(cp)
  return s
}

/**
 * KS X 1001 완성형 한글 2350자를 EUC-KR 디코딩으로 생성한다.
 * 영역: 행(고위 바이트) 0xB0~0xC8 × 열(저위 바이트) 0xA1~0xFE.
 * `TextDecoder('euc-kr')`(Node 내장)로 각 2바이트를 디코딩 → 한글 음절(가~힣)만 채택.
 */
function ksx1001Hangul(): string {
  const dec = new TextDecoder("euc-kr")
  let out = ""
  for (let hi = 0xb0; hi <= 0xc8; hi++) {
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      const ch = dec.decode(Buffer.from([hi, lo]))
      // 디코드 실패(U+FFFD) 방어 — 한글 음절 범위만 채택.
      if (ch >= "가" && ch <= "힣") out += ch
    }
  }
  return out
}

/** retain 할 글리프 집합(텍스트). subset-font 는 이 문자열의 문자들만 남긴다. */
function buildRetainText(): string {
  const parts: string[] = []

  // ASCII(공백~~) + Latin-1 보충(라틴 악센트·기본 기호).
  parts.push(range(0x0020, 0x007e))
  parts.push(range(0x00a0, 0x00ff))

  // CJK 기호·문장부호(U+3000–U+303F): 「」『』〈〉《》【】… 등.
  parts.push(range(0x3000, 0x303f))

  // 한글 자모(U+3130–U+318F): ㄱㄴㄷ … ㅏㅑ … 단독 표기 대비.
  parts.push(range(0x3130, 0x318f))

  // KS X 1001 완성형 한글 2350자(상용) — 현대 한국어 99%+ 커버, ~452KB 목표 달성.
  parts.push(ksx1001Hangul())

  // 자주 쓰는 추가 기호(통화·수학·화살표·따옴표·말줄임표·불릿 등).
  const extra =
    "₩€£¥¢" + // 통화
    "±×÷≤≥≠≈√∞∑∏∫" + // 수학
    "→←↑↓↔⇒⇔▶◀▲▼" + // 화살표/삼각
    "‘’“”‚„«»‹›" + // 따옴표
    "–—―…·•◦※○●◯◎□■△▽◇◆☆★" + // 문장부호/불릿/도형
    "©®™§¶†‡№℃℉°′″" // 기타 기호
  parts.push(extra)

  return parts.join("")
}

async function main(): Promise<void> {
  const srcBuffer = readFileSync(SRC)
  const beforeBytes = statSync(SRC).size

  const retainText = buildRetainText()
  // 중복 제거 후 글리프 수(코드포인트 기준) 로그.
  const uniqueCodepoints = new Set(Array.from(retainText)).size
  console.log(
    `[subset] 원본=${SRC}\n[subset] retain 코드포인트=${uniqueCodepoints}자`,
  )

  // 변수 weight 축 유지를 위해 variationAxes 미지정. woff2 출력.
  const subsetBuffer = await subsetFont(srcBuffer, retainText, {
    targetFormat: "woff2",
  })

  writeFileSync(OUT, subsetBuffer)
  const afterBytes = subsetBuffer.byteLength

  const beforeKb = (beforeBytes / 1024).toFixed(1)
  const afterKb = (afterBytes / 1024).toFixed(1)
  const reduction = (((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(1)

  console.log("\n=== 서브셋 결과 ===")
  console.log(`원본:   ${beforeBytes} bytes (${beforeKb} KB)`)
  console.log(`서브셋: ${afterBytes} bytes (${afterKb} KB)`)
  console.log(`감소:   ${reduction}%`)
  console.log(`출력:   ${OUT}`)
  console.log(
    "\n⚠️ layout.tsx 의 src 를 이 파일로 교체한 뒤 Playwright 로 한글 렌더 실측 필수.",
  )
}

void main().catch((err) => {
  console.error("[subset] 실패:", err)
  process.exitCode = 1
})
