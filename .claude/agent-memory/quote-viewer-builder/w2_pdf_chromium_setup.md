---
name: w2-pdf-chromium-setup
description: W2 PDF 생성 스택(puppeteer-core 24 + @sparticuz/chromium 148) 설치·환경분기·헤드리스 함정
metadata:
  type: project
---

W2 PDF 기능(T2.1)에서 확정된 PDF 생성 스택 사실. **T2.3(/q/[slug]/pdf 라우트)가 그대로 이어받음.**

- 설치 버전(런타임 dependencies): `puppeteer-core@^24.43.1` + `@sparticuz/chromium@^148.0.0`.
  - **Why:** `@sparticuz/chromium@148` 의 devDependency 가 `puppeteer-core: ^24.42.0` → 검증 짝은 24.x. puppeteer-core latest(25.x)는 매트릭스 밖이라 24.x 로 핀.
  - **How to apply:** puppeteer-core 업그레이드 시 chromium 패키지의 devDependency 매트릭스 먼저 확인. 풀 `puppeteer` 는 절대 설치 금지(Vercel 크기 초과).

- ⚠️ **`@sparticuz/chromium@148` 에는 정적 `headless` 프로퍼티가 없다**(구버전과 다름, 실측: export 키 = args/graphics/setGraphicsMode/executablePath/graphicsMode). `chromium.headless` 쓰면 `TS2339`.
  - **Why:** 버전업으로 제거됨. 옛 튜토리얼·context7 매트릭스 코드(`headless: chromium.headless`)는 stale.
  - **How to apply:** 서버리스 launch 옵션은 `{ args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" }` 로 직접 지정. `"shell"` 은 README 권장 경량 모드.

- 환경 분기 방식(스파이크에서 검증, T2.3 라우트도 동일 lib 헬퍼로 공유 예정):
  - 서버리스 판정 = `process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME`.
  - 로컬(Windows): `executablePath` = 시스템 Chrome. 후보 1순위 `C:\Program Files\Google\Chrome\Application\chrome.exe`(실측 존재), Edge 폴백. `headless: true`, `args: ["--no-sandbox","--disable-setuid-sandbox"]`.
  - 레퍼런스: `scripts/test/pdf-spike.ts` 의 `buildLaunchOptions()`/`findLocalBrowserPath()`.

- `vercel.json` 생성됨: `functions["app/q/[slug]/pdf/route.ts"] = { memory: 1024, maxDuration: 30 }`. 라우트 파일은 T2.3 에서 생성(경로만 예약).
  - T2.3 라우트는 추가로 `export const runtime = "nodejs"` 필요(edge 불가).

- PDF 출력 디렉터리 `out/` 은 `.gitignore` 의 기존 `/out/`(next.js 정적 export 용)로 이미 무시됨 — 별도 추가 불필요.

관련: [[w2-korean-font-pretendard]]
