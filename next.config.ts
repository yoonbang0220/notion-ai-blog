import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Next.js 16에서 "use cache" 지시자 활성화
  cacheComponents: true,
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
