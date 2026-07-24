/** 서버 컴포넌트 — 랜딩 Hero LCP preload (페이지당 Hero 1장) */
export function LandingHeroPreload({ src }: { src: string }) {
  if (!src.startsWith('/')) return null;

  const ext = src.split('.').pop()?.toLowerCase();
  const type =
    ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : undefined;

  return (
    <link
      rel="preload"
      as="image"
      href={src}
      fetchPriority="high"
      {...(type ? { type } : {})}
      // 풀블리드 Hero — 뷰포트 전체 너비 기준
      imageSizes="100vw"
    />
  );
}
