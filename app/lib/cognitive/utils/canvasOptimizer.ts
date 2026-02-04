/**
 * Canvas DrawImage 최적화
 * 시각적 노이즈를 최소화하기 위한 최적화 기법
 */

export class CanvasOptimizer {
  /**
   * 우선순위 기반 이미지 로딩
   */
  static async preloadImagesWithPriority(
    imageUrls: string[],
    priority: 'high' | 'medium' | 'low' = 'high',
    onProgress?: (progress: number) => void
  ): Promise<Map<string, HTMLImageElement>> {
    const imageCache = new Map<string, HTMLImageElement>();
    const batchSize = priority === 'high' ? 5 : priority === 'medium' ? 3 : 1;
    const total = imageUrls.length;
    let loaded = 0;

    // 배치 단위로 로딩
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (url) => {
          if (!url || imageCache.has(url)) {
            loaded++;
            onProgress?.(loaded / total);
            return;
          }
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          return new Promise<void>((resolve) => {
            img.onload = () => {
              imageCache.set(url, img);
              loaded++;
              onProgress?.(loaded / total);
              resolve();
            };
            img.onerror = () => {
              console.warn(`Failed to load image: ${url}`);
              loaded++;
              onProgress?.(loaded / total);
              resolve(); // 실패해도 계속 진행
            };
            img.src = url;
          });
        })
      );

      // 우선순위에 따라 다음 배치까지 대기
      if (priority === 'low' && i + batchSize < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return imageCache;
  }

  /**
   * 최적화된 DrawImage (Double Buffering)
   */
  static createOptimizedRenderer(
    canvas: HTMLCanvasElement,
    imageCache: Map<string, HTMLImageElement>
  ) {
    const ctx = canvas.getContext('2d', {
      alpha: false, // 투명도 비활성화 (성능 향상)
      desynchronized: true, // 비동기 렌더링
      willReadFrequently: false // 읽기 최소화
    });

    if (!ctx) throw new Error('Canvas context not available');

    // Double Buffering
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext('2d', {
      alpha: false
    });

    if (!offscreenCtx) throw new Error('Offscreen context not available');

    /**
     * Binary 이미지 렌더링 (최적화)
     */
    const renderBinary = (imageUrl: string) => {
      const img = imageCache.get(imageUrl);
      if (!img) return;

      // Offscreen에서 렌더링
      offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      offscreenCtx.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

      // Main canvas에 복사 (한 번의 drawImage 호출)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreenCanvas, 0, 0);
    };

    return { renderBinary, ctx };
  }
}
