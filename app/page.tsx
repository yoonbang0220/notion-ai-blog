import Link from "next/link"
import { cacheLife } from "next/cache"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getCategories, getPosts } from "@/lib/notion"

// Notion 콘텐츠는 약 1분 단위로 갱신한다(PRD: ISR 60초).
async function getHomeData() {
  "use cache"
  cacheLife("minutes")

  const [posts, categories] = await Promise.all([getPosts(), getCategories()])
  // PRD: 홈은 최신 글 6개만 노출
  return { latestPosts: posts.slice(0, 6), categories }
}

export default async function HomePage() {
  const { latestPosts, categories } = await getHomeData()

  return (
    <div className="flex flex-col">
      {/* Hero: "초보가 쓴 초보 가이드" 톤 */}
      <section className="from-background to-muted/30 flex flex-col items-center justify-center gap-6 bg-gradient-to-b px-4 py-24 text-center">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            나도 했으니, 너도 할 수 있다
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed">
            AI를 처음 공부하는 사람을 위한 실전 학습 노트.
            <br />
            막연했던 도구·강의·실험을 따라할 수 있게 정리합니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/posts" className={cn(buttonVariants({ size: "lg" }))}>
            전체 글 보기
          </Link>
          <Link
            href="/about"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            운영자 소개
          </Link>
        </div>
      </section>

      {/* 카테고리 칩 */}
      {categories.length > 0 && (
        <section className="px-4 py-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="text-muted-foreground mr-2 text-sm">카테고리</span>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="bg-muted hover:bg-muted/70 rounded-full px-3 py-1 text-sm transition-colors"
              >
                {c.name}
                <span className="text-muted-foreground ml-1 text-xs">
                  ({c.postCount})
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 최신 글 3×2 그리드 */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold">최신 글</h2>
          {latestPosts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              아직 발행된 글이 없습니다. Notion DB 연동 후 첫 글을 발행해 주세요.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => (
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
          )}
        </div>
      </section>
    </div>
  )
}
