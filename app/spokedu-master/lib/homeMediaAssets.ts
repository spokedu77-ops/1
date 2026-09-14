export const HOME_MEDIA_PACK_ID = 'spokedu_master_home_media';
export const HOME_MEDIA_PACK_NAME = 'SPOKEDU MASTER 홈 미디어';

export const HOME_MEDIA_FALLBACK = {
  heroImage: '/images/spokedu/home/field-editorial/home-hero-field.webp',
} as const;

export type MasterHomeMedia = {
  heroImage: string | null;
};

function asPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  return path || null;
}

export function normalizeMasterHomeMedia(raw: unknown): MasterHomeMedia {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    heroImage: asPath(source.heroImage),
  };
}

export function homeMediaStoragePath(ext = 'webp') {
  return `spokedu-master/home-media/heroImage.${ext}`;
}
