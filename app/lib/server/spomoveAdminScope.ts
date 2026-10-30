export { isSpomoveOnlyAdmin } from '@/app/lib/auth/platformAdminIdentity';
import { SPOMOVE_TRAINING_BGM_PACK_ID, SPOMOVE_DIVE_ENVIRONMENT_PACK_ID } from '@/app/lib/spomove/spomoveAssetPackIds';
import { SPOMOVE_CONTENT_PACK_ID, SPOMOVE_THUMBNAIL_PACK_ID, SPOMOVE_GUIDE_VIDEO_PACK_ID, SPOMOVE_HOME_FEATURED_PACK_ID, SPOMOVE_HUB_FAMILY_FEATURED_PACK_ID } from '@/app/lib/spomove/spomoveOfficialAssets';
import { SPOMOVE_THEMED_PACK_BY_THEME } from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';
import { SPOMOVE_VARIANT_PACK_ID } from '@/app/admin/spomove/training/_player/lib/variantFruitAssets';

const packs = new Set([SPOMOVE_TRAINING_BGM_PACK_ID, SPOMOVE_DIVE_ENVIRONMENT_PACK_ID, SPOMOVE_CONTENT_PACK_ID, SPOMOVE_THUMBNAIL_PACK_ID, SPOMOVE_GUIDE_VIDEO_PACK_ID, SPOMOVE_HOME_FEATURED_PACK_ID, SPOMOVE_HUB_FAMILY_FEATURED_PACK_ID, SPOMOVE_VARIANT_PACK_ID, ...Object.values(SPOMOVE_THEMED_PACK_BY_THEME).map(pack => pack.packId)]);
export function isSpomoveAssetPack(id: string): boolean { return packs.has(id); }
const storagePrefixes = ['audio/spomove/bgm/', 'spokedu-master/spomove-thumbnails/', 'themes/iiwarmup/spomove_dive/', `themes/iiwarmup/${SPOMOVE_VARIANT_PACK_ID}/`, ...Object.values(SPOMOVE_THEMED_PACK_BY_THEME).map(pack => `themes/iiwarmup/${pack.subfolder}/`)];
export function isSpomoveStoragePath(path: string): boolean {
  if (!path || path.includes('\\') || /[%\x00-\x1f]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) return false;
  return storagePrefixes.some(prefix => path.startsWith(prefix) && path.length > prefix.length);
}
