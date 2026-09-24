/**
 * DIVE 통합 환경 테마 — Asset Hub 파노라마와 Admin/플레이어 UI 공용.
 *
 * 파노라마 원본은 Hub storage pack(`themes/iiwarmup/spomove_dive/...`)이다.
 * public 정적 경로 `/spomove/dive/environments/{theme}/panorama.webp`는
 * 저장소에 없으므로 요청하지 않는다. 엔트리가 없으면 색 스카이박스로 둔다.
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
  { id: 'theme2', label: '놀이공원' },
  { id: 'theme3', label: '정글' },
  { id: 'theme4', label: '테마 4' },
  { id: 'theme5', label: '테마 5' },
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

/** 구 flowColorTheme / 잘못된 값 → space 기본 */
export function normalizeDiveThemeId(value: unknown): DiveThemeId {
  if (isDiveThemeId(value)) return value;
  return 'space';
}

export type DivePanoramaUrls = {
  highUrl?: string;
  lowUrl?: string;
  yawDeg: number;
};

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
