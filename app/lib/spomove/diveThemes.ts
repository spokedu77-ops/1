/**
 * DIVE 통합 환경 테마 — Asset Hub 파노라마와 Admin/플레이어 UI 공용.
 */

export const DIVE_THEME_IDS = ['space', 'theme2', 'theme3', 'theme4', 'theme5'] as const;

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
};

/** Admin UI 표시 라벨 (이름 확정 전 임시) */
export const DIVE_THEME_UI: ReadonlyArray<{ id: DiveThemeId; label: string }> = [
  { id: 'space', label: 'SPACE' },
  { id: 'theme2', label: '테마 2' },
  { id: 'theme3', label: '테마 3' },
  { id: 'theme4', label: '테마 4' },
  { id: 'theme5', label: '테마 5' },
];

export function isDiveThemeId(value: unknown): value is DiveThemeId {
  return typeof value === 'string' && (DIVE_THEME_IDS as readonly string[]).includes(value);
}

/** 구 flowColorTheme / 잘못된 값 → space 기본 */
export function normalizeDiveThemeId(value: unknown): DiveThemeId {
  if (isDiveThemeId(value)) return value;
  return 'space';
}

/** Hub·DB에 없을 때 public 정적 폴백 */
export function divePanoramaStaticFallback(themeId: DiveThemeId): string {
  return `/spomove/dive/environments/${themeId}/panorama.webp`;
}

export type DivePanoramaUrls = {
  highUrl?: string;
  lowUrl: string;
  yawDeg: number;
};

export function resolveDivePanoramaUrls(
  themeId: DiveThemeId,
  entry: DiveThemeEntry | null | undefined,
  getPreviewUrl: (path: string | null | undefined) => string | null,
): DivePanoramaUrls {
  const staticFallback = divePanoramaStaticFallback(themeId);
  if (!entry) {
    return { lowUrl: staticFallback, yawDeg: 0 };
  }
  const lowUrl = getPreviewUrl(entry.panoramaLowPath) ?? staticFallback;
  const highUrl = entry.hasHighRes ? (getPreviewUrl(entry.panoramaPath) ?? undefined) : undefined;
  return { highUrl, lowUrl, yawDeg: entry.yawDeg ?? 0 };
}
