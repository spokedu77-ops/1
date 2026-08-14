import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // lucide 배럴 + Turbopack HMR 시 "module factory is not available" 완화 및 트리쉐이킹
    optimizePackageImports: [
      'lucide-react',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/core',
      '@tiptap/pm',
    ],
  },
  typescript: { ignoreBuildErrors: false },
  images: {
    qualities: [75, 88, 90, 92],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.postimg.cc",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // 빌드 시 webpack 사용 (PWA 플러그인 호환, turbopack 명시적 비활성화)
  turbopack: {},
  async redirects() {
    return [
      // Legacy root MASTER manifest — admin/teacher PWA 누수 방지용으로 경로 이전
      {
        source: '/manifest.json',
        destination: '/spokedu-master/manifest.webmanifest',
        permanent: true,
      },
      // --- Clean public URL migration: legacy /spokedu/** → clean ---
      { source: "/spokedu", destination: "/", permanent: true },
      { source: "/spokedu/about", destination: "/about", permanent: true },
      { source: "/spokedu/education", destination: "/education", permanent: true },
      { source: "/spokedu/dispatch", destination: "/dispatch", permanent: true },
      { source: "/spokedu/private", destination: "/private", permanent: true },
      { source: "/spokedu/programs/spomove/catalog", destination: "/spomove/catalog", permanent: true },
      { source: "/spokedu/programs/spomove", destination: "/spomove", permanent: true },
      { source: "/spokedu/curriculum", destination: "/subscription", permanent: true },
      { source: "/spokedu/records", destination: "/records", permanent: true },
      { source: "/spokedu/records/:slug", destination: "/records/:slug", permanent: true },
      { source: "/spokedu/contact", destination: "/contact", permanent: true },
      { source: "/spokedu/spomat", destination: "/spomat", permanent: true },
      { source: "/spokedu/partners", destination: "/partners", permanent: true },

      // --- Other legacy aliases → clean ---
      { source: "/curriculum", destination: "/subscription", permanent: true },
      { source: "/programs/spomove/catalog", destination: "/spomove/catalog", permanent: true },
      { source: "/programs/spomove", destination: "/spomove", permanent: true },
      { source: "/programs", destination: "/spomove", permanent: true },
      { source: "/cases", destination: "/records", permanent: true },
      { source: "/cases/:slug", destination: "/records/:slug", permanent: true },
      { source: "/spokedu/cases", destination: "/records", permanent: true },
      { source: "/spokedu/cases/:slug", destination: "/records/:slug", permanent: true },

      // --- Redirect-only programs → dispatch ---
      { source: "/spokedu/programs/paps", destination: "/dispatch", permanent: true },
      { source: "/spokedu/programs/camp", destination: "/dispatch", permanent: true },
      { source: "/spokedu/programs/oneday-event", destination: "/dispatch", permanent: true },
      { source: "/spokedu/programs/monthly-newsports", destination: "/dispatch", permanent: true },
      { source: "/programs/paps", destination: "/dispatch", permanent: true },
      { source: "/programs/camp", destination: "/dispatch", permanent: true },
      { source: "/programs/oneday-event", destination: "/dispatch", permanent: true },
      { source: "/programs/monthly-newsports", destination: "/dispatch", permanent: true },
      { source: "/spokedu/programs", destination: "/spomove", permanent: true },

      // --- Absorbed legacy marketing routes ---
      { source: "/spokedu/monthly", destination: "/records", permanent: true },
      { source: "/spokedu/monthly/:path*", destination: "/records", permanent: true },
      { source: "/monthly", destination: "/records", permanent: true },
      { source: "/spokedu/insights", destination: "/about", permanent: true },
      { source: "/insights", destination: "/about", permanent: true },
      { source: "/parents", destination: "/private", permanent: true },
      { source: "/institutions", destination: "/dispatch", permanent: true },
      { source: "/audience", destination: "/", permanent: true },

      // --- Admin / training legacy (unchanged) ---
      { source: "/admin/iiwarmup/flow", destination: "/admin/spomove/training", permanent: true },
      { source: "/admin/iiwarmup/flow/:path*", destination: "/admin/spomove/training", permanent: true },
      { source: "/program/iiwarmup/flow", destination: "/admin/spomove/training", permanent: true },
      { source: "/program/iiwarmup/flow/:path*", destination: "/admin/spomove/training", permanent: true },
      { source: "/admin/iiwarmup/play", destination: "/admin/iiwarmup", permanent: true },
      { source: "/admin/iiwarmup/spomove", destination: "/admin/spomove/training", permanent: true },
      { source: "/admin/iiwarmup/spomove/training", destination: "/admin/spomove/training", permanent: true },
      {
        source: "/admin/iiwarmup/spomove/training/:path*",
        destination: "/admin/spomove/training/:path*",
        permanent: true,
      },
      { source: "/teacher/notice", destination: "/teacher", permanent: true },
      { source: "/teacher/chat", destination: "/teacher", permanent: true },
      { source: "/admin/chat", destination: "/admin", permanent: true },
    ];
  },
  // YouTube/Vimeo embed 허용. "www.youtube.com에서 연결을 거부했습니다" 방지 (CSP frame-src만 추가)
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://payment-gateway-sandbox.tosspayments.com https://payment-gateway.tosspayments.com",
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
      {
        source: "/images/spokedu/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
