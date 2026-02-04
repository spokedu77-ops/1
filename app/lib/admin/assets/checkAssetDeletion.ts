/**
 * Asset 삭제 가능 여부 확인 (Hard block)
 * 사용 중이면 삭제 불가
 */

import { checkAssetUsage } from './checkAssetUsage';

export class AssetDeletionBlockedError extends Error {
  constructor(
    public assetId: string,
    public usage: { templates: number; publishedPrograms: number }
  ) {
    const total = usage.templates + usage.publishedPrograms;
    super(
      `Cannot delete: ${total} items use this asset (${usage.templates} templates, ${usage.publishedPrograms} published programs)`
    );
    this.name = 'AssetDeletionBlockedError';
  }
}

/**
 * Asset 삭제 가능 여부 확인
 * 사용 중이면 Error throw (하드 블록)
 */
export async function checkAssetDeletion(assetId: string): Promise<boolean> {
  const usage = await checkAssetUsage(assetId);

  // 하드 블록: 사용 중이면 삭제 불가
  if (usage.templates.length > 0 || usage.publishedPrograms.length > 0) {
    throw new AssetDeletionBlockedError(assetId, {
      templates: usage.templates.length,
      publishedPrograms: usage.publishedPrograms.length
    });
  }

  return true;
}
