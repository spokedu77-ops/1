import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      { source: "/admin/iiwarmup/play-test", destination: "/admin/iiwarmup/play", permanent: true },
      { source: "/admin/iiwarmup/creator", destination: "/admin/iiwarmup/think", permanent: true },
      { source: "/teacher/notice", destination: "/teacher", permanent: true },
    ];
  },
};

export default nextConfig;
