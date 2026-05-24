/** 서버 컴포넌트 — 랜딩 Hero LCP preload (페이지당 Hero 1장) */
export function LandingHeroPreload({ src }: { src: string }) {
  if (!src.startsWith('/')) return null;
  return <link rel="preload" as="image" href={src} fetchPriority="high" />;
}
