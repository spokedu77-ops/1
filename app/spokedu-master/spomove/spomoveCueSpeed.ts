import type { OfficialSpomovePreset } from './officialSpomovePresets';

/** 브리핑에서 선택 가능한 자극 속도(초) — 정수만 */
export const SPOMOVE_CUE_SPEED_OPTIONS = [2, 3, 4, 5, 6] as const;
export type SpomoveCueSpeedSec = (typeof SPOMOVE_CUE_SPEED_OPTIONS)[number];

const STORAGE_KEY = 'spokedu-master.spomove.lastCueSeconds';

/**
 * 브리핑에서 자극 속도(2~6초)를 고를 수 있는 프리셋.
 * 제외: DIVE, 숫자 기차, 흰 공, 소행성, 순차 기억
 */
export function supportsCueSpeedOverride(preset: OfficialSpomovePreset): boolean {
  if (preset.programGroup === 'dive' || preset.programGroup === 'bonus') return false;
  if (preset.programGroup === 'sequential-memory') return false;
  if (preset.engine.mode === 'spatial') return false;
  if (preset.engine.mode === 'flow') return false;
  if (preset.engine.mode === 'reactTrain') {
    const level = preset.engine.level;
    // 8 소행성 · 9 숫자 기차 · 10 흰 공
    if (level === 8 || level === 9 || level === 10) return false;
  }
  return true;
}

export function clampCueSpeedSec(value: number): SpomoveCueSpeedSec {
  const rounded = Math.round(value);
  if ((SPOMOVE_CUE_SPEED_OPTIONS as readonly number[]).includes(rounded)) {
    return rounded as SpomoveCueSpeedSec;
  }
  if (rounded < 2) return 2;
  if (rounded > 6) return 6;
  return 3;
}

export function readLastCueSeconds(fallback: number = 3): SpomoveCueSpeedSec {
  if (typeof window === 'undefined') return clampCueSpeedSec(fallback);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === '') return clampCueSpeedSec(fallback);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return clampCueSpeedSec(fallback);
    return clampCueSpeedSec(parsed);
  } catch {
    return clampCueSpeedSec(fallback);
  }
}

export function writeLastCueSeconds(value: number): SpomoveCueSpeedSec {
  const next = clampCueSpeedSec(value);
  if (typeof window === 'undefined') return next;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}

export function resolveInitialCueSeconds(preset: OfficialSpomovePreset): SpomoveCueSpeedSec {
  if (!supportsCueSpeedOverride(preset)) return clampCueSpeedSec(preset.cueSeconds);
  return readLastCueSeconds(preset.cueSeconds);
}
