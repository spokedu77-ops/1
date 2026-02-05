/**
 * Storage Path 유틸리티
 * DB에는 path만 저장, URL은 런타임에 생성
 */

import type { ActionKey } from '../constants/physics';

/**
 * Action 이미지 경로 생성
 * @param themeId Asset Pack ID (e.g., 'kitchen_v1')
 * @param actionKey Action key (e.g., 'POINT')
 * @param variant 'off' | 'on' | 'off1' | 'off2' | 'on1' | 'on2'
 * @returns Storage path
 */
export function actionImagePath(
  themeId: string,
  actionKey: ActionKey,
  variant: 'off' | 'on' | 'off1' | 'off2' | 'on1' | 'on2'
): string {
  if (variant === 'off1' || variant === 'off2' || variant === 'on1' || variant === 'on2') {
    return `themes/${themeId}/actions/${actionKey}/${variant}.webp`;
  }
  return `themes/${themeId}/actions/${actionKey}/${variant}.webp`;
}

/**
 * BGM 파일 경로 생성
 * @param fileName BGM 파일명 (e.g., 'bgmplay_bpm140_v1.mp3')
 * @returns Storage path
 */
export function bgmPath(fileName: string): string {
  return `bgm/${fileName}`;
}

/** Think 150 BGM 경로 */
export function thinkBgmPath(fileName: string): string {
  return `audio/think/bgm/${fileName}`;
}

/** Flow Phase BGM 경로 */
export function flowBgmPath(fileName: string): string {
  return `audio/flow/bgm/${fileName}`;
}

/** Flow Phase Equirect 배경 (2:1 파노라마) 경로 */
export function flowPanoPath(fileName: string): string {
  return `flow_backgrounds/pano/${fileName}`;
}

/**
 * Background 이미지 경로 생성
 * @param themeId Asset Pack ID
 * @param phase 'play' | 'think' | 'flow'
 * @returns Storage path
 */
export function backgroundPath(
  themeId: string,
  phase: 'play' | 'think' | 'flow'
): string {
  return `themes/${themeId}/backgrounds/${phase}.webp`;
}

/**
 * Object 이미지 경로 생성
 * @param themeId Asset Pack ID
 * @param objectName Object 이름
 * @returns Storage path
 */
export function objectPath(themeId: string, objectName: string): string {
  return `themes/${themeId}/objects/${objectName}.webp`;
}

/**
 * Theme ID 생성 (주차 무관)
 * @param theme 테마 (e.g., 'kitchen')
 * @param version 버전 번호 (기본값: 1)
 * @returns Theme ID (e.g., 'kitchen_v1')
 */
export function generateThemeId(theme: string, version = 1): string {
  return `${theme}_v${version}`;
}

/**
 * Week Key 생성
 * @param year 연도 (e.g., 2026)
 * @param month 월 (1-12)
 * @param week 주차 (1-4)
 * @returns Week Key (e.g., '2026-01-W1')
 */
export function generateWeekKey(
  year: number,
  month: number,
  week: number
): string {
  return `${year}-${month.toString().padStart(2, '0')}-W${week}`;
}

/**
 * Think Pack ID 생성 (Play theme 기반)
 * 규칙: kitchen_v1 → kitchen_think_v1 (버전 유지)
 * @param playThemeId Play theme ID (e.g., 'kitchen_v1')
 * @returns Think pack ID (e.g., 'kitchen_think_v1')
 */
export function generateThinkPackId(playThemeId: string): string {
  // kitchen_v1 → kitchen_think_v1
  return `${playThemeId}_think`;
}

/**
 * Think Object 이미지 경로 생성
 * @param thinkPackId Think pack ID (e.g., 'kitchen_think_v1')
 * @param color 색상 (red|blue|yellow|green)
 * @param slug 파일명 (확장자 제외)
 * @returns Storage path
 */
export function thinkObjectPath(
  thinkPackId: string,
  color: 'red' | 'blue' | 'yellow' | 'green',
  slug: string
): string {
  return `themes/${thinkPackId}/think/${color}/${slug}.webp`;
}

/**
 * Think 150 setA/setB 이미지 경로 생성 (월별 × 주차별)
 * @param packId Pack ID (e.g., 'iiwarmup_think_default')
 * @param month 1..12
 * @param week 2 | 3 | 4 (1주차는 이미지 없음)
 * @param set 'setA' | 'setB'
 * @param color PADColor
 * @param slug 파일명 (확장자 제외)
 */
export function think150ImagePath(
  packId: string,
  month: number,
  week: 2 | 3 | 4,
  set: 'setA' | 'setB',
  color: 'red' | 'green' | 'yellow' | 'blue',
  slug: string
): string {
  return `themes/think150/${packId}/month${month}/week${week}/${set}/${color}/${slug}.webp`;
}

/** Play Asset Pack 슬롯 키 (5 action × set1 off/on, set2 off/on = 20) */
export type PlaySlotKey =
  | 'a1_set1_off' | 'a1_set1_on' | 'a1_set2_off' | 'a1_set2_on'
  | 'a2_set1_off' | 'a2_set1_on' | 'a2_set2_off' | 'a2_set2_on'
  | 'a3_set1_off' | 'a3_set1_on' | 'a3_set2_off' | 'a3_set2_on'
  | 'a4_set1_off' | 'a4_set1_on' | 'a4_set2_off' | 'a4_set2_on'
  | 'a5_set1_off' | 'a5_set1_on' | 'a5_set2_off' | 'a5_set2_on';

export const PLAY_SLOT_KEYS: PlaySlotKey[] = [
  'a1_set1_off', 'a1_set1_on', 'a1_set2_off', 'a1_set2_on',
  'a2_set1_off', 'a2_set1_on', 'a2_set2_off', 'a2_set2_on',
  'a3_set1_off', 'a3_set1_on', 'a3_set2_off', 'a3_set2_on',
  'a4_set1_off', 'a4_set1_on', 'a4_set2_off', 'a4_set2_on',
  'a5_set1_off', 'a5_set1_on', 'a5_set2_off', 'a5_set2_on',
];

/**
 * Play Asset Pack 이미지 경로 (주차별)
 * @param weekKey e.g. '2026-01-W1'
 * @param slotKey e.g. 'a1_set1_off', 'a1_set1_on'
 * @param ext 확장자 (기본 'webp')
 */
export function playAssetPath(
  weekKey: string,
  slotKey: PlaySlotKey,
  ext = 'webp'
): string {
  return `play_assets/${weekKey}/${slotKey}.${ext}`;
}

/**
 * Play Asset Pack BGM 경로 (주차별)
 */
export function playAssetBgmPath(weekKey: string, fileName: string): string {
  return `play_assets/${weekKey}/bgm/${fileName}`;
}

/**
 * 주차 기반 Theme ID 생성
 * @deprecated Use generateThemeId instead. This function is kept for backward compatibility.
 * @param year 연도 (e.g., 2026)
 * @param month 월 (1-12)
 * @param week 주차 (1-4)
 * @param theme 테마 (e.g., 'kitchen')
 * @returns Theme ID (e.g., '2026-01-W1_kitchen')
 */
export function generateWeekBasedThemeId(
  year: number,
  month: number,
  week: number,
  theme: string
): string {
  const weekId = `${year}-${month.toString().padStart(2, '0')}-W${week}`;
  return `${weekId}_${theme}`;
}
