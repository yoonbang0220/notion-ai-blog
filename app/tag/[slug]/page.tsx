import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { cacheLife } from "next/cache"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getPosts } from "@/lib/notion"

type Params = Promise<{ slug: string }>

async function getPostsByTag(slug: string) {
  "use cache"
  cacheLife("minutes")
  const all = await getPosts()
  return all.filter((p) => p.tags.includes(slug))
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `태그: #${slug}`,
    description: `#${slug} 태그가 달린 글 목록입니다.`,
  }
}

export default function TagPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Suspense fallback={<TagListSkeleton />}>
        <TagHeader params={params} />
        <TagList params={params} />
      </Suspense>
    </div>
  )
}

async function TagHeader({ params }: { params: Params }) {
  const { slug } = await params
  return (
    <header className="mb-8 space-y-2">
      <p className="text-muted-foreground text-sm">태그</p>
      <h1 className="text-3xl font-bold">#{slug}</h1>
    </header>
  )
}

async function TagList({ params }: { params: Params }) {
  const { slug } = await params
  const posts = await getPostsByTag(slug)

  if (posts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">이 태그에는 아직 글이 없습니다.</p>
    )
  }

  return (
    <>
      <p className="text-muted-foreground mb-6 text-sm">
        총 {posts.length}개의 글이 있습니다.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.slug} href={`/posts/${post.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                <CardDescription className="text-xs">
                  {post.category} ·{" "}
                  {new Date(post.publishedAt).toLocaleDateString("ko-KR")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-3 text-sm">
                  {post.summary}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}

function TagListSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-3 w-20 rounded" />
        <div className="bg-muted h-8 w-48 rounded" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-muted h-32 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
