/** next/image `sizes` — 실제 레이아웃 기준 (과다 다운로드 방지) */
export const IMAGE_SIZES = {
  heroSplit: '(max-width: 768px) 100vw, 50vw',
  heroWide: '(max-width: 1024px) 100vw, 55vw',
  card3: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  card4: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw',
  gateThumb: '(max-width: 768px) 92vw, 280px',
  card2: '(max-width: 768px) 100vw, 50vw',
  full: '100vw',
  proofThumb: '148px',
} as const;

export type ImageSizesPreset = keyof typeof IMAGE_SIZES;
