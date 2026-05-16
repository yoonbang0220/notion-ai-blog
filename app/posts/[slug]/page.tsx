import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { cacheLife } from "next/cache"
import { Separator } from "@/components/ui/separator"
import { getPostBySlug } from "@/lib/notion"

// Next.js 16: params 는 Promise. 반드시 await 한다.
type Params = Promise<{ slug: string }>

async function getCachedPost(slug: string) {
  "use cache"
  cacheLife("minutes")
  return getPostBySlug(slug)
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getCachedPost(slug)
  if (!post) return { title: "글을 찾을 수 없어요" }
  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      images: post.coverUrl ? [post.coverUrl] : undefined,
    },
  }
}

// Next.js 16 Cache Components 규칙:
// 페이지 본체는 정적 셸로 남기고, runtime data(여기선 params + Notion 조회)에
// 의존하는 부분은 Suspense 경계 안에 둔다.
export default function PostPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <PostContent params={params} />
    </Suspense>
  )
}

async function PostContent({ params }: { params: Params }) {
  const { slug } = await params
  const post = await getCachedPost(slug)
  if (!post) notFound()

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8 space-y-3">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <Link
            href={`/category/${post.category}`}
            className="bg-muted hover:bg-muted/70 rounded-full px-2 py-0.5 transition-colors"
          >
            {post.category}
          </Link>
          <span>·</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString("ko-KR")}
          </time>
        </div>
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{post.title}</h1>
        <p className="text-muted-foreground text-lg">{post.summary}</p>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${tag}`}
                className="bg-muted text-muted-foreground hover:bg-muted/70 rounded-full px-2 py-0.5 text-xs transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </header>

      <Separator className="my-6" />

      {/* TODO(W1): react-markdown + remark-gfm + rehype-highlight 로 post.content 렌더링.
          이미지는 next/image 로 래핑해 LCP 최적화 (PRD 기술 결정).
          현재는 placeholder. */}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <pre className="text-muted-foreground text-sm whitespace-pre-wrap">
          {post.content}
        </pre>
      </div>

      {/* TODO(W2): "같은 카테고리 추천 3개" 섹션 */}
    </article>
  )
}

function PostSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-12">
      <div className="mb-8 space-y-3">
        <div className="bg-muted h-3 w-32 rounded" />
        <div className="bg-muted h-10 w-3/4 rounded" />
        <div className="bg-muted h-5 w-full rounded" />
      </div>
      <Separator className="my-6" />
      <div className="space-y-3">
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-11/12 rounded" />
        <div className="bg-muted h-4 w-10/12 rounded" />
      </div>
    </div>
  )
}
