/** 스크린플레이(DB mode_id / preset_ref) → 메모리 게임 iframe 쿼리 */

import type { ProgramDetail } from '../types';

export type ScreenplayMeta = {
  title: string;
  modeId?: string;
  subtitle?: string;
  description?: string;
  presetRef?: string;
  thumbnailUrl?: string;
};

/** DB 스크린플레이 + 카탈로그 program_details 키 `sp_{id}` 오버레이 병합 */
export function mergeScreenplayProgramDetailForDrawer(
  sp: ScreenplayMeta | undefined,
  overlay: ProgramDetail | undefined
): ProgramDetail | null {
  const base: ProgramDetail = {
    title: sp?.title,
    functionType: sp?.modeId,
    subtitle: sp?.subtitle,
    activityMethod: sp?.description?.trim() ? sp.description : undefined,
  };
  const hasOverlay = overlay && Object.keys(overlay).length > 0;
  if (!sp && !hasOverlay) return null;
  return { ...base, ...(overlay ?? {}) };
}

export function screenplayDetailStorageKey(screenplayId: number): string {
  return `sp_${screenplayId}`;
}

export function getSpomoveLaunchParams(
  modeId: string | null | undefined,
  presetRef: string | null | undefined
): { mode: string; level: number } {
  const level = Number(presetRef ?? '1');
  const modeMap: Record<string, string> = {
    FLOW: 'flow',
    반응인지: 'basic',
    순차기억: 'spatial',
    스트룹: 'stroop',
    이중과제: 'dual',
    CHALLENGE: 'challenge',
  };
  const mode = modeMap[String(modeId ?? '')] ?? 'basic';
  const targetLevel = Number.isFinite(level) && level > 0 ? level : 1;
  return { mode, level: targetLevel };
}
