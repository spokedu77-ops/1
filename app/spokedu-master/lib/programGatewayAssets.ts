export const PROGRAM_GATEWAY_PACK_ID = 'spokedu_master_program_gateway_media';
export const PROGRAM_GATEWAY_PACK_NAME = 'SPOKEDU MASTER Programs Gateway 대표 이미지';

export const PROGRAM_GATEWAY_FALLBACK = {
  lessonHero: '/spokedu/spokedu-promo-banner.png',
  spomoveHero: '/images/spokedu/programs/program-spomove.jpg',
} as const;

export type ProgramGatewayHeroKey = 'lessonHero' | 'spomoveHero';

export type ProgramGatewayMedia = {
  lessonHero: string | null;
  spomoveHero: string | null;
};

function asPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  return path || null;
}

export function normalizeProgramGatewayMedia(raw: unknown): ProgramGatewayMedia {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    lessonHero: asPath(source.lessonHero),
    spomoveHero: asPath(source.spomoveHero),
  };
}

export function resolveProgramGatewayHero(
  media: ProgramGatewayMedia,
  key: ProgramGatewayHeroKey,
): string {
  return media[key] || PROGRAM_GATEWAY_FALLBACK[key];
}

export function programGatewayStoragePath(key: ProgramGatewayHeroKey, ext = 'webp') {
  return `spokedu-master/program-gateway/${key}.${ext}`;
}
