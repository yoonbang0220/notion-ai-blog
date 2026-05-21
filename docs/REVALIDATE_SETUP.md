# 견적 캐시 즉시 반영 설정 (Revalidate Webhook)

견적 페이지는 성능을 위해 분 단위로 캐시된다(`"use cache"` + `cacheLife("minutes")`).
Notion 에서 견적을 수정한 뒤 **즉시** 반영하고 싶을 때, 외부 자동화 도구(Make / Zapier 등)가
이 webhook 을 호출하면 해당 견적의 캐시가 무효화되어 다음 방문부터 최신 내용이 보인다.

## 엔드포인트

```
POST /api/revalidate
```

| 항목 | 값 |
|---|---|
| 메서드 | `POST` |
| 인증 헤더 | `Authorization: Bearer <NOTION_REVALIDATE_SECRET>` |
| 본문(JSON) | `{ "slug": "<견적 슬러그>" }` |
| 성공 응답 | `200 { "revalidated": true, "slug": "<슬러그>" }` |

`slug` 은 견적 URL `/q/<슬러그>` 의 마지막 부분(32자 hex)이다. Notion `슬러그`(Formula) 속성 값과 같다.

### 응답 코드

| 코드 | 의미 |
|---|---|
| 200 | 무효화 완료. 다음 방문부터 fresh |
| 400 | 본문 JSON 오류 또는 `slug` 누락/빈 값 |
| 401 | `Authorization` 헤더 누락 |
| 403 | 토큰 불일치 |
| 500 | 서버에 `NOTION_REVALIDATE_SECRET` 미설정(운영 설정 오류) |

## 시크릿 발급

`.env.local`(및 배포 환경 변수)에 `NOTION_REVALIDATE_SECRET` 을 강한 무작위 32자 이상으로 설정한다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ 이 값은 절대 클라이언트에 노출하지 않는다(`NEXT_PUBLIC_` 접두 금지). 외부 자동화 도구의
> 비밀 저장소에만 보관한다.

## Make / Zapier 연동 예시

1. **트리거** — Notion 의 견적(Invoice) 행이 수정될 때(Make 의 "Watch Database Items" 등).
2. **액션** — HTTP 모듈로 아래 요청을 보낸다.
   - URL: `https://<배포 도메인>/api/revalidate`
   - Method: `POST`
   - Headers: `Authorization: Bearer <NOTION_REVALIDATE_SECRET>`, `Content-Type: application/json`
   - Body: `{ "slug": "{{슬러그 속성 값}}" }`

## curl 로 수동 호출

```bash
curl -X POST https://<배포 도메인>/api/revalidate \
  -H "Authorization: Bearer $NOTION_REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"slug":"<견적 슬러그>"}'
```

## 동작 메모

- 무효화는 `revalidateTag('quote:<슬러그>', { expire: 0 })` 로 수행된다(webhook 즉시 만료 패턴).
  견적 페이지가 부여한 `quote:<슬러그>` 캐시 태그와 동일하다.
- 존재하지 않는 슬러그를 보내도 200 이 반환된다(태그 무효화는 견적 존재 여부와 무관).
- 캐시 무효화의 실제 반영(Notion 수정 → webhook → 화면 갱신)은 페이지를 다시 방문할 때 일어난다.
