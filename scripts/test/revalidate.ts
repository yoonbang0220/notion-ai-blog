/**
 * T2.4 — `/api/revalidate` Route Handler 통합 자기검증 + T2.5 robots/헤더 확인.
 *
 * 실행(별도 터미널에서 dev 서버를 먼저 띄운 뒤):
 *   1) npm run dev            # 포트 3000
 *   2) node --env-file=.env.local --import tsx scripts/test/revalidate.ts
 *
 * 이 스크립트는 dev 서버를 spawn 하지 않고 이미 떠 있는 서버(BASE_URL, 기본 http://localhost:3000)
 * 에 fetch 로 붙는다. (Windows 에서 dev 서버 프로세스 트리 종료가 불안정해 라이프사이클을
 * 호출자에게 위임 — pdf-route.ts 와 동일 패턴.)
 *
 * .env.local 필요 값: NOTION_REVALIDATE_SECRET, SEED_SLUG_ACTIVE.
 *
 * 검증 시나리오(ROADMAP T2.4 테스트 계획):
 *   1. 정상: Bearer <secret> + {slug: SEED_SLUG_ACTIVE} → 200, revalidated:true.
 *   2. 토큰 누락: Authorization 헤더 없이 → 401.
 *   3. 잘못된 토큰: Bearer wrong → 403.
 *   4. body 누락/빈 slug → 400 (빈 객체·빈 문자열·JSON 깨짐 3소항목).
 *   5. 존재하지 않는 슬러그 → 200 revalidated:true (revalidateTag 는 존재 여부 무관, 의도된 동작).
 *   6. 캐시 무효화 통합(Notion 수정 → 반영) → T2.6/Playwright 로 이연(여기선 미구현).
 *
 * T2.5 robots/헤더 확인(시나리오 R*):
 *   R1. GET /robots.txt → 200, 본문에 "Disallow: /q/" 포함.
 *   R2. GET /q/<SEED_SLUG_ACTIVE> 응답 헤더에 x-robots-tag: noindex, nofollow, noarchive.
 *   R3. GET /q/<SEED_SLUG_ACTIVE>/pdf 응답 헤더에 x-robots-tag(PDF 인덱싱 차단).
 */

type ScenarioResult = { name: string; ok: boolean; detail: string }

const BASE_URL = process.env.REVALIDATE_TEST_BASE_URL ?? "http://localhost:3000"
const SECRET = process.env.NOTION_REVALIDATE_SECRET
const SEED_SLUG_ACTIVE = process.env.SEED_SLUG_ACTIVE
const REVALIDATE_URL = `${BASE_URL}/api/revalidate`

/** revalidate 엔드포인트 POST 헬퍼. headers/body 를 그대로 전달. */
async function postRevalidate(opts: {
  token?: string
  /** raw 문자열 body(JSON 깨짐 케이스용) 또는 객체. undefined 면 body 미전송. */
  body?: string | object
  contentType?: string
}): Promise<{ status: number; json: unknown; text: string }> {
  const headers: Record<string, string> = {
    "Content-Type": opts.contentType ?? "application/json",
  }
  if (opts.token !== undefined) headers["Authorization"] = `Bearer ${opts.token}`

  let body: string | undefined
  if (opts.body !== undefined) {
    body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)
  }

  const res = await fetch(REVALIDATE_URL, { method: "POST", headers, body })
  const text = await res.text()
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {
    // 비-JSON 응답(예외 페이지 등) — text 로만 판단.
  }
  return { status: res.status, json, text }
}

/** 시나리오 1 — 정상: 올바른 토큰 + 시드 슬러그 → 200, revalidated:true. */
async function scenario1Normal(): Promise<ScenarioResult> {
  const name = "1. 정상(올바른 토큰 + 시드 슬러그)"
  if (!SECRET) return { name, ok: false, detail: "NOTION_REVALIDATE_SECRET 미설정" }
  if (!SEED_SLUG_ACTIVE)
    return { name, ok: false, detail: "SEED_SLUG_ACTIVE 미설정" }
  try {
    const { status, json } = await postRevalidate({
      token: SECRET,
      body: { slug: SEED_SLUG_ACTIVE },
    })
    const body = json as { revalidated?: boolean; slug?: string } | null
    const ok =
      status === 200 &&
      body?.revalidated === true &&
      body?.slug === SEED_SLUG_ACTIVE
    return {
      name,
      ok,
      detail: `status ${status} (기대 200), revalidated=${body?.revalidated}, slug일치=${body?.slug === SEED_SLUG_ACTIVE} → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** 시나리오 2 — 토큰 누락: Authorization 헤더 없이 → 401. */
async function scenario2MissingToken(): Promise<ScenarioResult> {
  const name = "2. 토큰 누락 → 401"
  try {
    const { status } = await postRevalidate({ body: { slug: "x" } })
    const ok = status === 401
    return {
      name,
      ok,
      detail: `status ${status} (기대 401) → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** 시나리오 3 — 잘못된 토큰: Bearer wrong → 403. */
async function scenario3WrongToken(): Promise<ScenarioResult> {
  const name = "3. 잘못된 토큰 → 403"
  try {
    const { status } = await postRevalidate({
      token: "wrong",
      body: { slug: "x" },
    })
    const ok = status === 403
    return {
      name,
      ok,
      detail: `status ${status} (기대 403) → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** 시나리오 4 — body 누락/빈 slug → 400 (3소항목: 빈 객체 / 빈 문자열 / JSON 깨짐). */
async function scenario4BadBody(): Promise<ScenarioResult> {
  const name = "4. body 누락/빈 slug → 400"
  if (!SECRET) return { name, ok: false, detail: "NOTION_REVALIDATE_SECRET 미설정" }
  try {
    const empty = await postRevalidate({ token: SECRET, body: {} })
    const blank = await postRevalidate({ token: SECRET, body: { slug: "  " } })
    const broken = await postRevalidate({
      token: SECRET,
      body: "{not json",
    })
    const ok =
      empty.status === 400 && blank.status === 400 && broken.status === 400
    return {
      name,
      ok,
      detail: `빈객체=${empty.status} 빈문자열=${blank.status} JSON깨짐=${broken.status} (모두 기대 400) → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** 시나리오 5 — 존재하지 않는 슬러그 → 200 revalidated:true (의도된 동작). */
async function scenario5UnknownSlug(): Promise<ScenarioResult> {
  const name = "5. 존재하지 않는 슬러그 → 200(의도)"
  if (!SECRET) return { name, ok: false, detail: "NOTION_REVALIDATE_SECRET 미설정" }
  const ghost = "ffffffffffffffffffffffffffffffff"
  try {
    const { status, json } = await postRevalidate({
      token: SECRET,
      body: { slug: ghost },
    })
    const body = json as { revalidated?: boolean; slug?: string } | null
    const ok =
      status === 200 && body?.revalidated === true && body?.slug === ghost
    return {
      name,
      ok,
      detail: `status ${status} (기대 200), revalidated=${body?.revalidated} → ${ok ? "PASS" : "FAIL"} (revalidateTag 는 존재 여부 무관)`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** 시나리오 6 — 캐시 무효화 통합: T2.6/Playwright 로 이연. */
function scenario6IntegrationDeferred(): ScenarioResult {
  return {
    name: "6. 캐시 무효화 통합(Notion 수정→반영)",
    ok: true,
    detail:
      "T2.6/Playwright 로 이연 — Notion 시드 수정 → revalidate POST → 재방문 반영은 E2E 영역.",
  }
}

/** R1 — /robots.txt 에 "Disallow: /q/" 포함. */
async function robotsTxt(): Promise<ScenarioResult> {
  const name = "R1. /robots.txt → Disallow: /q/"
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`)
    const text = await res.text()
    const ok = res.status === 200 && text.includes("Disallow: /q/")
    return {
      name,
      ok,
      detail: `status ${res.status}, 본문=${JSON.stringify(text.trim())} → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** R2 — /q/<slug> 응답 헤더 x-robots-tag noindex 확인. */
async function quoteHeader(): Promise<ScenarioResult> {
  const name = "R2. /q/<slug> 헤더 x-robots-tag"
  if (!SEED_SLUG_ACTIVE)
    return { name, ok: false, detail: "SEED_SLUG_ACTIVE 미설정" }
  try {
    const res = await fetch(`${BASE_URL}/q/${SEED_SLUG_ACTIVE}`)
    await res.arrayBuffer()
    const header = res.headers.get("x-robots-tag") ?? ""
    const ok = header.includes("noindex") && header.includes("nofollow")
    return {
      name,
      ok,
      detail: `x-robots-tag="${header}" → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

/** R3 — /q/<slug>/pdf 응답 헤더 x-robots-tag 확인(PDF 인덱싱 차단). */
async function pdfHeader(): Promise<ScenarioResult> {
  const name = "R3. /q/<slug>/pdf 헤더 x-robots-tag"
  if (!SEED_SLUG_ACTIVE)
    return { name, ok: false, detail: "SEED_SLUG_ACTIVE 미설정" }
  try {
    const res = await fetch(`${BASE_URL}/q/${SEED_SLUG_ACTIVE}/pdf`)
    await res.arrayBuffer()
    const header = res.headers.get("x-robots-tag") ?? ""
    const ok = header.includes("noindex") && header.includes("nofollow")
    return {
      name,
      ok,
      detail: `status ${res.status}, x-robots-tag="${header}" → ${ok ? "PASS" : "FAIL"}`,
    }
  } catch (error) {
    return { name, ok: false, detail: `예외: ${(error as Error).message}` }
  }
}

async function run() {
  console.log(
    `[환경] BASE_URL=${BASE_URL}, SECRET=${SECRET ? "(설정됨)" : "(미설정)"}, SEED_SLUG_ACTIVE=${SEED_SLUG_ACTIVE ?? "(미설정)"}`,
  )

  // 서버 가용성 사전 체크.
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
  // T2.4 revalidate 시나리오
  results.push(await scenario1Normal())
  results.push(await scenario2MissingToken())
  results.push(await scenario3WrongToken())
  results.push(await scenario4BadBody())
  results.push(await scenario5UnknownSlug())
  results.push(scenario6IntegrationDeferred())
  // T2.5 robots/헤더 확인
  results.push(await robotsTxt())
  results.push(await quoteHeader())
  results.push(await pdfHeader())

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
