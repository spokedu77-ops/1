/**
 * Asset 로딩 실패 시 Fallback 이미지 제공
 */

export class AssetLoadError extends Error {
  constructor(
    public assetId: string,
    public fallbackUrl: string
  ) {
    super(`Failed to load asset ${assetId}`);
    this.name = 'AssetLoadError';
  }
}

/**
 * Asset을 로드하고 실패 시 Fallback 사용
 */
export async function loadAssetWithFallback(
  url: string,
  fallbackUrl: string = '/images/default-action-off.png'
): Promise<string> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) throw new Error('Load failed');
    return url;
  } catch (error) {
    console.warn(`Asset 로딩 실패, Fallback 사용: ${url} → ${fallbackUrl}`);
    return fallbackUrl;
  }
}

/**
 * 여러 Asset을 일괄 로드 (Fallback 포함)
 */
export async function loadAssetsWithFallback(
  assets: Array<{ url: string; fallback?: string }>
): Promise<Array<{ url: string; loaded: string }>> {
  const results = await Promise.all(
    assets.map(async ({ url, fallback }) => {
      const loaded = await loadAssetWithFallback(url, fallback);
      return { url, loaded };
    })
  );
  return results;
}
