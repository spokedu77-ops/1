/**
 * DIVE 통합 환경 테마 — Asset Hub 파노라마와 Admin/플레이어 UI 공용.
 *
 * 파노라마 원본은 Hub storage pack(`themes/iiwarmup/spomove_dive/...`)이다.
 * public 정적 경로 `/spomove/dive/environments/{theme}/panorama.webp`는
 * 저장소에 없으므로 요청하지 않는다. 엔트리가 없으면 색 스카이박스로 둔다.
 */

export const DIVE_THEME_IDS = ['space', 'ocean', 'theme2', 'theme3', 'theme4', 'theme5'] as const;
export const LEGACY_DIVE_THEME_IDS = ['theme2', 'theme3', 'theme4', 'theme5'] as const;
export type DiveActiveThemeId = 'space' | 'ocean';
export const SPACE_OBSTACLE_DEFAULTS = {
  punch: '/spomove/dive/space/obstacles/83b53102-66de-49df-abf6-1a9abd539fce.png',
  duck: '/spomove/dive/space/obstacles/f1b34531-7710-4fae-86ce-3a15a111089e.png',
  kick: '/spomove/dive/space/obstacles/b1297343-359e-47ec-a592-a4fbd95945b4.png',
  reach: '/spomove/dive/space/obstacles/d6ff454c-bba9-45e5-aba7-45040bd7f8ad.png',
} as const;
export const OCEAN_DUCK_SHARK_FRAMES = [
  '/spomove/dive/ocean/obstacles/ocean_duck_shark_01.png',
  '/spomove/dive/ocean/obstacles/ocean_duck_shark_02.png',
  '/spomove/dive/ocean/obstacles/ocean_duck_shark_03.png',
  '/spomove/dive/ocean/obstacles/ocean_duck_shark_04.png',
] as const;
export const OCEAN_OBSTACLE_DEFAULTS = {
  duck: OCEAN_DUCK_SHARK_FRAMES[0],
  punch: '/spomove/dive/ocean/obstacles/ocean_punch_treasure_chest.png',
  kick: '/spomove/dive/ocean/obstacles/ocean_kick_barrel.png',
  reach: '/spomove/dive/ocean/obstacles/ocean_reach_vault_door.png',
} as const;
export type OceanObstacleKind = keyof typeof OCEAN_OBSTACLE_DEFAULTS;
export type OceanObstacleUrls = Record<OceanObstacleKind, string>;
export type DiveObstacleKind = OceanObstacleKind;
export type DiveObstacleUrls = OceanObstacleUrls;

export function getDiveObstacleDefaults(theme: DiveActiveThemeId): DiveObstacleUrls {
  return theme === 'ocean' ? OCEAN_OBSTACLE_DEFAULTS : SPACE_OBSTACLE_DEFAULTS;
}

export type DiveThemeId = (typeof DIVE_THEME_IDS)[number];

export type DiveThemeEntry = {
  panoramaPath: string;
  panoramaLowPath: string;
  width: number;
  height: number;
  fileSize: number;
  updatedAt: number;
  /** true = panoramaPath가 실제 4096×2048 고해상도 파일 */
  hasHighRes: boolean;
  /** 파노라마 정면 방향 오프셋 (°, -180 ~ +180, 기본 0) */
  yawDeg?: number;
  obstacles?: Partial<Record<OceanObstacleKind, string>>;
};

/** Active selection order. Legacy IDs above remain storage/history identities only. */
export const DIVE_THEME_UI: ReadonlyArray<{ id: DiveActiveThemeId; label: string }> = [
  { id: 'space', label: 'SPACE' },
  { id: 'ocean', label: 'OCEAN' },
];

export type DiveActionMoveUnityTheme = 'theme2' | 'theme3';
export type DiveUnityThemeId = 'golden-theme-01' | 'jungle-adventure-01';

const DIVE_UNITY_THEME_IDS: Record<DiveActionMoveUnityTheme, DiveUnityThemeId> = {
  theme2: 'golden-theme-01',
  theme3: 'jungle-adventure-01',
};

export function isDiveActionMoveUnityTheme(themeId: unknown): themeId is DiveActionMoveUnityTheme {
  return themeId === 'theme2' || themeId === 'theme3';
}

export function resolveDiveUnityThemeId(themeId: DiveThemeId): DiveUnityThemeId | null {
  return isDiveActionMoveUnityTheme(themeId) ? DIVE_UNITY_THEME_IDS[themeId] : null;
}

export function isDiveThemeId(value: unknown): value is DiveThemeId {
  return typeof value === 'string' && (DIVE_THEME_IDS as readonly string[]).includes(value);
}

/** Legacy/invalid launch settings fall back to SPACE, never reinterpret them as OCEAN. */
export function normalizeDiveThemeId(value: unknown): DiveThemeId {
  if (value === 'space' || value === 'ocean') return value;
  return 'space';
}

export function resolveOceanObstacleUrls(entry: DiveThemeEntry | null | undefined,
  getPreviewUrl: (path: string | null | undefined) => string | null): OceanObstacleUrls {
  return resolveDiveObstacleUrls('ocean', entry, getPreviewUrl);
}

export function resolveDiveObstacleUrls(theme: DiveActiveThemeId, entry: DiveThemeEntry | null | undefined,
  getPreviewUrl: (path: string | null | undefined) => string | null): DiveObstacleUrls {
  return Object.fromEntries(Object.entries(getDiveObstacleDefaults(theme)).map(([kind, fallback]) =>
    [kind, getPreviewUrl(entry?.obstacles?.[kind as OceanObstacleKind]) ?? fallback],
  )) as OceanObstacleUrls;
}

export type DivePanoramaUrls = {
  highUrl?: string;
  lowUrl?: string;
  yawDeg: number;
};
export type DivePanoramaStatus = 'loading' | 'ready' | 'unregistered' | 'failed';

export function hasDivePanorama(entry: DiveThemeEntry | null | undefined): boolean {
  return Boolean(entry?.panoramaLowPath || (entry?.hasHighRes && entry.panoramaPath));
}

export function resolveDivePanoramaUrls(
  _themeId: DiveThemeId,
  entry: DiveThemeEntry | null | undefined,
  getPreviewUrl: (path: string | null | undefined) => string | null,
): DivePanoramaUrls {
  if (!entry) {
    return { yawDeg: 0 };
  }
  const lowUrl = getPreviewUrl(entry.panoramaLowPath) ?? undefined;
  const highUrl = entry.hasHighRes ? (getPreviewUrl(entry.panoramaPath) ?? undefined) : undefined;
  return { highUrl, lowUrl, yawDeg: entry.yawDeg ?? 0 };
}
