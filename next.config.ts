import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({ dest: "public" });

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.postimg.cc",
      },
    ],
  },
  // 빌드 시 webpack 사용 (PWA 플러그인 호환, turbopack 명시적 비활성화)
  turbopack: {},
  async redirects() {
    return [
      { source: "/admin/iiwarmup/play", destination: "/admin/iiwarmup", permanent: true },
      { source: "/teacher/notice", destination: "/teacher", permanent: true },
      { source: "/teacher/chat", destination: "/teacher", permanent: true },
      { source: "/admin/chat", destination: "/admin", permanent: true },
    ];
  },
  // YouTube/Vimeo embed 허용. "www.youtube.com에서 연결을 거부했습니다" 방지 (CSP frame-src만 추가)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
          },
        ],
      },
      {
        source: "/spomove/variant-fruits/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/spomove/variant-vehicles/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/spomove/variant-emotions/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/spomove/variant-animals/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default withPWA(nextConfig);
