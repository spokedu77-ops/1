import { VARIANT_FRUIT_IMAGE_URLS } from './signals';

/** 변형 색지각: 이미지 URL 목록을 브라우저 캐시에 올립니다. */
export function preloadVariantFruitImages(urls: readonly string[] = VARIANT_FRUIT_IMAGE_URLS): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return Promise.all(
    urls.map(
      (href) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const done = () => resolve();
          img.onload = done;
          img.onerror = done;
          img.src = href;
        })
    )
  ).then(() => {});
}
