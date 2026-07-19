import type { OfficialSpomovePreset } from './officialSpomovePresets';
import {
  SPOMOVE_TARGET_GROUP_LABELS,
  getOfficialSpomovePresetGuide,
  type SpomoveTargetGroup,
} from './officialSpomovePresetGuides';

/** 브리핑에서 선택 가능한 자극 속도(초) — 정수만 */
export const SPOMOVE_CUE_SPEED_OPTIONS = [2, 3, 4, 5, 6] as const;
export type SpomoveCueSpeedSec = (typeof SPOMOVE_CUE_SPEED_OPTIONS)[number];

export type SpomoveCueSpeedGuide = {
  sec: SpomoveCueSpeedSec;
  tempoLabel: string;
  summary: string;
  /** 왜 이 초인지 — 짧은 논거 */
  reason: string;
  recommendTargets: SpomoveTargetGroup[];
};

/** 초별 템포·추천 대상·논거 (수업용 가이드) */
export const SPOMOVE_CUE_SPEED_GUIDES: Record<SpomoveCueSpeedSec, SpomoveCueSpeedGuide> = {
  2: {
    sec: 2,
    tempoLabel: '매우 빠름',
    summary: '연속 반응·심화. 이미 익숙한 반에 적합합니다.',
    reason: '간격이 짧아 신호를 보고 바로 움직여야 합니다.',
    recommendTargets: ['elementaryUpper'],
  },
  3: {
    sec: 3,
    tempoLabel: '기본',
    summary: '대부분의 수업 기본값. 초등 저학년·고학년 일반 수업에 맞습니다.',
    reason: '보고 판단한 뒤 이동하기에 가장 무난한 템포입니다.',
    recommendTargets: ['elementaryLower', 'elementaryUpper'],
  },
  4: {
    sec: 4,
    tempoLabel: '여유',
    summary: '판단 시간을 조금 더 줍니다. 초등 저학년·도입에 무난합니다.',
    reason: '여유 1초가 생겨 실수가 줄고 따라오기 쉽습니다.',
    recommendTargets: ['elementaryLower', 'specialSupport'],
  },
  5: {
    sec: 5,
    tempoLabel: '천천히',
    summary: '처음 배우는 반·미취학에 추천합니다.',
    reason: '처음 익히는 동작도 여유 있게 맞출 수 있습니다.',
    recommendTargets: ['preschool', 'elementaryLower', 'specialSupport'],
  },
  6: {
    sec: 6,
    tempoLabel: '아주 천천히',
    summary: '처음 경험·특수 지원·여유 있는 안내에 적합합니다.',
    reason: '시범·안내를 곁들여도 움직일 시간이 충분합니다.',
    recommendTargets: ['preschool', 'specialSupport'],
  },
};

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

export function getCueSpeedGuide(sec: number): SpomoveCueSpeedGuide {
  return SPOMOVE_CUE_SPEED_GUIDES[clampCueSpeedSec(sec)];
}

export function formatCueSpeedTargetLabel(targets: readonly SpomoveTargetGroup[]): string {
  return targets.map((target) => SPOMOVE_TARGET_GROUP_LABELS[target]).join('·');
}

/**
 * 이 활동의 추천 대상·생각 난이도를 보고 권장 자극 속도(초)를 고릅니다.
 * - 쉬움 / 미취학·특수 중심 → 더 느리게
 * - 어려움 / 초등 고학년 중심 → 더 빠르게
 * - 그 외 → 3초(기본)
 */
export function recommendedCueSecondsForPreset(preset: OfficialSpomovePreset): SpomoveCueSpeedSec {
  const guide = getOfficialSpomovePresetGuide(preset);
  const targets = new Set(guide.targetGroups);

  if (guide.thinkingLevel === 'hard') {
    return targets.has('elementaryUpper') && !targets.has('preschool') ? 2 : 3;
  }

  if (guide.thinkingLevel === 'easy') {
    if (targets.has('preschool') || targets.has('specialSupport')) return 5;
    return 4;
  }

  // normal
  if (targets.has('preschool') && !targets.has('elementaryUpper')) return 5;
  if (targets.has('specialSupport') && !targets.has('elementaryUpper')) return 4;
  if (targets.has('elementaryUpper') && !targets.has('preschool') && !targets.has('elementaryLower')) {
    return 2;
  }
  return 3;
}
