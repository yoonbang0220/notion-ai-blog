import type { Metadata } from "next"
import Link from "next/link"
import { cacheLife } from "next/cache"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getPosts } from "@/lib/notion"

export const metadata: Metadata = {
  title: "글 목록",
  description: "AI 학습 블로그의 전체 글 목록입니다.",
}

async function getPublishedPosts() {
  "use cache"
  cacheLife("minutes")
  return getPosts()
}

export default async function PostsPage() {
  const posts = await getPublishedPosts()

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">전체 글</h1>
        <p className="text-muted-foreground">
          AI 입문자를 위한 학습 기록을 최신순으로 정리했습니다.
        </p>
      </header>

      {/* TODO(W2): 클라이언트 사이드 검색바 컴포넌트 추가 (글 100개 이하 가정, includes/fuse.js) */}

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">아직 발행된 글이 없습니다.</p>
      ) : (
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
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {post.summary}
                  </p>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
