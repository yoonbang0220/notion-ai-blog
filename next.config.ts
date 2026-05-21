import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Next.js 16에서 "use cache" 지시자 활성화
  cacheComponents: true,
  // PDF 생성용 @sparticuz/chromium 을 서버 번들에서 제외(externalize)한다.
  // 번들러가 패키지를 relocate 하면 압축 크롬 바이너리 경로(node_modules/@sparticuz/chromium/bin)가
  // 깨져 Vercel 서버리스에서 "input directory ... does not exist" 로 launch 실패한다(T2.8 실측).
  // externalize 하면 패키지가 함수의 node_modules 에 통째로 복사돼 bin 이 그대로 유지된다.
  // (puppeteer-core 도 함께 외부화 — 동일 launch 의존성.) 키는 Next 16 안정 export(구 serverComponentsExternalPackages 아님).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  images: {
    // Notion file 속성의 `file.url`은 1시간 후 만료되므로 next/image 로 재호스팅한다.
    // 스키마 출처: https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/12-images.mdx
    remotePatterns: [
      {
        protocol: "https",
        hostname: "prod-files-secure.s3.us-west-2.amazonaws.com",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "s3.us-west-2.amazonaws.com",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "www.notion.so",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
  },
}

export default nextConfig
