import type { NextConfig } from "next";

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      { source: "/admin/iiwarmup/play-test", destination: "/admin/iiwarmup/play", permanent: true },
      { source: "/admin/iiwarmup/creator", destination: "/admin/iiwarmup/think", permanent: true },
      { source: "/teacher/notice", destination: "/teacher", permanent: true },
    ];
  },
} as NextConfig;

export default nextConfig;
