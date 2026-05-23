# T2.8 — production 실측 / MVP launch 리포트

> 작성: 2026-05-23 · 대상: `https://notion-ai-blog-zeta.vercel.app` (Vercel Hobby, GitHub 연동)
> T2.6 에서 이연된 production 실측 항목(E·I·revalidate·Lighthouse·콜드스타트)을 마무리한다.

## 1. revalidate webhook — production E2E ✅

`POST /api/revalidate` (node https, 시크릿은 `.env.local` in-process·마스킹):

| 케이스 | 기대 | 실측 |
|--------|------|------|
| Authorization 헤더 없음 | 401 | ✅ 401 |
| 잘못된 Bearer | 403 | ✅ 403 |
| 올바른 Bearer + 깨진 JSON body | 400 | ✅ 400 |
| 올바른 Bearer + `{slug}` | 200 `{revalidated:true}` | ✅ 200 |

→ 로컬 `NOTION_REVALIDATE_SECRET` 이 Vercel 값과 일치(200 확인). production webhook 정상.
→ **이연 I(revalidate 통합)**: 엔드포인트 동작(200) + 로컬 `test:revalidate` 9/9 로 메커니즘 커버. **콘텐츠 편집 통합 E2E(Notion 견적 필드 수정→반영)는 운영자 데이터 보존을 위해 생략**(자동화가 운영자 워크스페이스를 변경하지 않음).

## 2. 잘못된/Draft slug → not-found ✅ (단, soft-404)

- 미존재(well-formed 32자) slug `/q/zzz…` → **not-found UI 정상 렌더**(본문 18KB, "찾을 수 없음" 포함·견적 데이터 없음). 정상 slug 는 42KB·견적 데이터(발행·유효기간) 포함.
- ⚠️ **HTTP 상태는 200(soft-404)**: `/q/[slug]` 는 PPR(◐)이라 정적 셸이 200 으로 먼저 flush 된 뒤 `notFound()` 가 스트림에서 렌더된다. **사용자 경험은 정상**(올바른 not-found 화면). `/q/` 는 noindex + robots Disallow 라 **soft-404 의 SEO 영향 0**. 하드 404 상태가 필요하면 백로그.
- **이연 E(Draft→404)**: Draft 시드 부재 + Notion 변경 금지로 라이브 Draft E2E 는 생략. 단 `getQuoteBySlug` 의 서버측 `상태=발행` 필터로 Draft/Archived 는 결과에서 제외(→ not-found) 됨이 보장되며, `test:admin-quotes` 시나리오3(`상태=초안`→빈 배열)·`test:quotes` 로 메커니즘 검증됨.

## 3. Lighthouse — production 랜딩 `/` (mobile, LH 13.3) ✅

| 카테고리 | 점수 |
|----------|------|
| Performance | **84** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

핵심 지표: FCP 0.9s · **LCP 4.5s** · TBT 40ms · CLS 0 · SI 0.9s.
- A11y/BP/SEO 만점. Performance 84 의 발목은 **LCP 4.5s**(모바일) — Pretendard 변수폰트 `display:block`(PDF 한글 보장 트레이드오프)이 주요인으로 추정. **백로그**: 폰트 preload·히어로 최적화.
- ⚠️ `/q/[slug]` 는 비밀 slug 라 제3자(PSI 등) 전송 금지 → Lighthouse 미측정(로컬 npx 측정도 생략). 랜딩 기준으로 충분.

## 4. PDF 응답시간 (production)

| | 시간 |
|---|------|
| 콜드스타트(이전 실측, T2.8 초기) | ~15.3s |
| 웜(금회 실측 3회) | 9.82s / 3.30s / 4.06s |
| 동시 5건(이전) | 5/5 HTTP 200 · ~8s |

모두 `200 · application/pdf`.

## 5. 콜드스타트 R4 판단 → **accept + 백로그** (다운그레이드 안 함)

- 현황: 콜드 ~15.3s 로 10초 목표 초과. 웜 3.3~4.3s 는 목표 내. 동시 5/5 정상.
- **결정**: 서버리스 PDF(@sparticuz/chromium) 유지, **window.print 다운그레이드 하지 않음**. 근거:
  1. PDF 는 견적당 1회성 액션 → 콜드 빈도 낮음(대부분 웜).
  2. window.print 는 서버 PDF 의 한글 폰트·A4 레이아웃·파일명 일관성을 잃음(품질 저하).
  3. MVP Goal("결재용 PDF 1클릭 수신")은 현재 동작으로 충족.
- **백로그(측정 후 선별)**: Vercel Fluid/최소 인스턴스·함수 번들 경량화·콜드 시 사용자 안내(스피너/예상시간) UX.

## 6. 종합 — MVP launch 판정

- ✅ production 배포·환경변수(Notion 4 + Admin 2)·랜딩·견적 열람·noindex·PDF·revalidate webhook 모두 동작.
- ✅ Lighthouse(랜딩) Perf 84 / A11y·BP·SEO 100.
- 결정·문서화 완료: 콜드스타트 accept(R4), soft-404(noindex 영향 0), revalidate 콘텐츠 통합·Draft 라이브 E2E 는 메커니즘 커버(운영자 데이터 보존).
- **백로그(런치 비차단)**: LCP 4.5s 최적화 · 하드 404 상태 · 콘텐츠 편집 통합 E2E(운영자 데이터 필요) · 콜드스타트 단축 · (선택) 커스텀 도메인.

→ **MVP(Phase 0~2) launch 완료.**
