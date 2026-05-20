# Quote Viewer

Notion 기반 견적서 웹뷰어 + PDF 다운로드 MVP.

운영자가 Notion `Quotes` DB 에 견적을 쓰고 `Status=Published` 로 바꾸면, 추측 불가능한 공유 URL(`/q/[slug]`) 로 클라이언트가 로그인 없이 견적서를 열람하고 1회 클릭으로 PDF 를 받는다.

> 단일 출처(SSOT): [`docs/QUOTE_VIEWER_PRD.md`](./docs/QUOTE_VIEWER_PRD.md)

## 현재 상태

W0 초기화 완료. 견적서 도메인 라우트(`/q/[slug]`, `/q/[slug]/pdf`, `/api/revalidate`) 는 W1 부터 추가한다.

## 기술 스택

| 패키지 | 역할 |
|---|---|
| Next.js 16 (App Router, Cache Components) | 프레임워크 |
| React 19 / TypeScript 5 (strict) | 언어/런타임 |
| Tailwind CSS v4 + shadcn/ui (base-nova, `@base-ui/react`) | UI |
| `@notionhq/client` v5 | Notion 페치 (`databases.retrieve` → `dataSources.query` 2단계 패턴) |
| next-themes, sonner, lucide-react | 부가 기능 |

## 시작하기

```bash
npm install
cp .env.example .env.local
# .env.local 에 NOTION_TOKEN, NOTION_DATABASE_ID 입력

npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint
npx prettier --write .
```

## 환경 변수

| 변수 | 용도 | 비고 |
|---|---|---|
| `NOTION_TOKEN` | Notion Internal Integration Token | 서버 전용 |
| `NOTION_DATABASE_ID` | Quotes DB ID | 서버 전용 |
| `NOTION_REVALIDATE_SECRET` | `/api/revalidate` 인증 토큰 | W2 |
| `NEXT_PUBLIC_APP_URL` | 사이트 절대 URL | OG·canonical 등 |
| `NEXT_PUBLIC_APP_NAME` | 사이트 이름 | 표시용 |

Notion 관련 변수에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 말 것.

## 라이선스

MIT
