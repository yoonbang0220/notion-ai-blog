import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "운영자 소개",
  description: "이 블로그를 운영하는 사람과, 왜 이 블로그를 시작했는지 이야기합니다.",
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <article className="space-y-6">
        <header className="space-y-2">
          <p className="text-muted-foreground text-sm">About</p>
          <h1 className="text-3xl font-bold sm:text-4xl">나도 AI 초보입니다</h1>
        </header>

        <div className="text-foreground/90 space-y-4 text-base leading-relaxed">
          <p>안녕하세요. 이 블로그는 AI를 처음 공부하는 사람을 위한 학습 노트입니다.</p>
          <p>
            저 역시 비개발자 출신으로 AI 도구와 강의를 직접 따라해 보며 배우고 있습니다.
            그 과정에서 막혔던 부분, 헷갈렸던 개념, 그리고 결국 해냈을 때의 흐름을 그대로
            기록합니다.
          </p>
          <p>
            전문 블로그의 진입장벽이 높다고 느끼는 분이라면, 여기서 한 편이라도 끝까지
            읽고 &quot;나도 한번 해볼 수 있겠다&quot;는 자신감을 얻어가시면 좋겠습니다.
          </p>
        </div>

        {/* TODO(W3): 운영자 사진, 메일/SNS 링크, 다룬 도구 리스트 등 보강 */}
      </article>
    </div>
  )
}
