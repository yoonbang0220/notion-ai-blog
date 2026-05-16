import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"

/**
 * Notion 글 발행 시 외부 자동화(Make/Zapier 등)에서 호출하는 webhook.
 *
 * PRD: Notion 자체 webhook 이 없으므로 자동화 도구가 이 엔드포인트를 POST 한다.
 * 호출 시 `Authorization: Bearer <NOTION_REVALIDATE_SECRET>` 헤더로 인증한다.
 *
 * Body(optional): { path?: string } — 특정 경로만 revalidate 하고 싶을 때.
 * 미지정 시 홈/글 목록만 갱신한다. 상세 페이지는 ISR(`cacheLife("minutes")`)에 위임.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTION_REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "NOTION_REVALIDATE_SECRET 가 설정되지 않았습니다." },
      { status: 500 }
    )
  }

  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // path 미지정 시 홈/목록 페이지만 갱신
  const body = (await request.json().catch(() => ({}))) as { path?: string }
  const paths = body.path ? [body.path] : ["/", "/posts"]
  for (const path of paths) {
    revalidatePath(path)
  }

  return NextResponse.json({ revalidated: true, paths })
}
