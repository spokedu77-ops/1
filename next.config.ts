import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({ dest: "public" });

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  // 빌드 시 webpack 사용 (PWA 플러그인 호환, turbopack 명시적 비활성화)
  turbopack: {},
  async redirects() {
    return [
      { source: "/admin/iiwarmup/play-test", destination: "/admin/iiwarmup/play", permanent: true },
      { source: "/admin/iiwarmup/creator", destination: "/admin/iiwarmup/think", permanent: true },
      { source: "/teacher/notice", destination: "/teacher", permanent: true },
      { source: "/teacher/chat", destination: "/teacher", permanent: true },
      { source: "/admin/chat", destination: "/admin", permanent: true },
    ];
  },
};

export default withPWA(nextConfig);
