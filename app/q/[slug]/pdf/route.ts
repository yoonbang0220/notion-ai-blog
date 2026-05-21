import type { NextRequest } from "next/server"
import puppeteer, { type Browser } from "puppeteer-core"

import { buildLaunchOptions } from "@/lib/pdf-browser"
import { getQuoteBySlug } from "@/lib/quotes"

/**
 * `/q/[slug]/pdf` — 견적서를 헤드리스 Chromium 으로 인쇄해 `application/pdf` 로 응답한다(T2.3).
 *
 * 흐름:
 *   1. `params.slug` await → `getQuoteBySlug(slug)`(server-only lib).
 *      slug 형식 위반·미공개·없음은 lib 가 `null` 반환 → **404**.
 *   2. 같은 도메인의 `/q/${slug}?print=1` 페이지를 puppeteer-core 로 goto.
 *      `?print=1` 자체는 서버 렌더 분기에 쓰지 않는다(Cache Components prerender 게이트를
 *      깨지 않으려 searchParams 를 셸에서 읽지 않음). UI 크롬(헤더/푸터/버튼) 숨김은
 *      Tailwind `print:hidden`(= `@media print`)으로 처리하며, puppeteer `page.pdf()` 는
 *      기본적으로 print 미디어를 에뮬레이트하므로 자동 적용된다.
 *   3. `page.pdf({ format: "A4", ... })` → PDF 바이트.
 *   4. `Content-Disposition: attachment; filename*=UTF-8''<encoded>`(RFC 5987) 로 한글 파일명.
 *
 * ⚠️ Next.js 16: `params` 는 Promise → 반드시 await.
 * ⚠️ 런처는 반드시 `finally` 에서 close(실패/타임아웃 시에도 좀비 프로세스 방지).
 * ⚠️ 환경 분기(로컬 시스템 Chrome vs 서버리스 @sparticuz/chromium)는 `lib/pdf-browser` 공유.
 *
 * noindex(정합성 규칙 5)는 `proxy.ts` 의 `/q/:path*` matcher 가 이 응답에도
 * `X-Robots-Tag: noindex, nofollow, noarchive` 를 강제하므로 별도 작업 불필요.
 */

// ⚠️ cacheComponents:true 환경에서는 `export const runtime` 명시가 빌드/런타임 에러를 낸다
//    ("Route segment config 'runtime' is not compatible with nextConfig.cacheComponents").
//    runtime 기본값이 이미 'nodejs' 이므로(출처: route-segment-config/runtime.md "'nodejs' (default)")
//    명시하지 않아도 Node 런타임으로 동작한다. Edge 는 puppeteer 와 무관하게 cacheComponents 미지원.
//    메모리/타임아웃은 vercel.json 의 functions["app/q/[slug]/pdf/route.ts"]={memory:1024,maxDuration:30} 가 담당.
export const maxDuration = 30

/** PDF 파일명용 날짜 포맷: ISO 문자열(또는 today) → `YYYYMMDD`. 파싱 실패 시 today 폴백. */
function formatDateYYYYMMDD(isoDate: string | null): string {
  const date = isoDate ? new Date(isoDate) : new Date()
  const safe = Number.isNaN(date.getTime()) ? new Date() : date
  const yyyy = safe.getFullYear()
  const mm = String(safe.getMonth() + 1).padStart(2, "0")
  const dd = String(safe.getDate()).padStart(2, "0")
  return `${yyyy}${mm}${dd}`
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  // ⚠️ Next.js 16 — params 는 Promise.
  const { slug } = await ctx.params

  // 규칙 3 — slug 형식 위반/미공개/없음은 lib 단계에서 null → 404.
  const quote = await getQuoteBySlug(slug)
  if (!quote) {
    return new Response("Not Found", { status: 404 })
  }

  // 자체 도메인의 견적 페이지를 인쇄 대상으로 사용한다(origin 은 요청에서 그대로 계승).
  const targetUrl = new URL(`/q/${slug}?print=1`, _req.nextUrl.origin)

  let browser: Browser | undefined
  try {
    browser = await puppeteer.launch(await buildLaunchOptions())
    const page = await browser.newPage()
    // 한글 폰트(Pretendard, display:block) 로드 완료까지 대기 — networkidle0.
    await page.goto(targetUrl.toString(), { waitUntil: "networkidle0" })
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
      },
    })

    // 파일명: 견적서_<clientCompany>_<YYYYMMDD>.pdf (RFC 5987 UTF-8 인코딩).
    const company = quote.clientCompany ?? "고객사"
    const dateStr = formatDateYYYYMMDD(quote.issuedAt)
    const filename = `견적서_${company}_${dateStr}.pdf`
    const encodedFilename = encodeURIComponent(filename)

    // page.pdf() 는 Uint8Array(v24) 를 반환한다. Response body 로 안전 전달을 위해
    // 백킹 ArrayBuffer 의 정확한 구간만 복사해 넘긴다(서브어레이 offset 안전).
    const body = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    })
  } catch (error) {
    // 런처 실패·타임아웃 등. 상세 메시지는 서버 로그에만 남기고(시스템 경로·바이너리
    // 경로 등 내부 정보 노출 방지 — C2 리뷰 반영), 클라이언트에는 일반 메시지만 반환.
    const message = (error as Error).message
    console.error(`[pdf ${slug}] PDF 생성 실패: ${message}`)
    return new Response("PDF 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.", {
      status: 500,
    })
  } finally {
    // ⚠️ 어떤 경로로든 브라우저는 반드시 닫는다(좀비 프로세스/메모리 누수 방지).
    await browser?.close()
  }
}
