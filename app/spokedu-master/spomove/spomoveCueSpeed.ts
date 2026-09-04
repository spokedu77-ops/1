import type { OfficialSpomovePreset } from './officialSpomovePresets';
import {
  SPOMOVE_TARGET_GROUP_LABELS,
  getOfficialSpomovePresetGuide,
  type SpomoveTargetGroup,
} from './officialSpomovePresetGuides';

/** 브리핑에서 선택 가능한 자극 속도(초) — 정수만 */
export const SPOMOVE_CUE_SPEED_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
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
  1: {
    sec: 1,
    tempoLabel: '어려움',
    summary: '가장 빠른 반응 속도입니다.',
    reason: '신호 전환 간격이 매우 짧아 즉각적인 판단이 필요합니다.',
    recommendTargets: ['elementaryUpper'],
  },
  2: {
    sec: 2,
    tempoLabel: '어려움',
    summary: '연속 반응·심화. 이미 익숙한 반에 적합합니다.',
    reason: '간격이 짧아 신호를 보고 바로 움직여야 합니다.',
    recommendTargets: ['elementaryUpper'],
  },
  3: {
    sec: 3,
    tempoLabel: '보통',
    summary: '대부분의 수업 기본값. 초등 저학년·고학년 일반 수업에 맞습니다.',
    reason: '보고 판단한 뒤 이동하기에 가장 무난한 템포입니다.',
    recommendTargets: ['elementaryLower', 'elementaryUpper'],
  },
  4: {
    sec: 4,
    tempoLabel: '보통',
    summary: '판단 시간을 조금 더 줍니다. 초등 저학년·도입에 무난합니다.',
    reason: '여유 1초가 생겨 실수가 줄고 따라오기 쉽습니다.',
    recommendTargets: ['elementaryLower', 'specialSupport'],
  },
  5: {
    sec: 5,
    tempoLabel: '쉬움',
    summary: '처음 배우는 반·미취학에 추천합니다.',
    reason: '처음 익히는 동작도 여유 있게 맞출 수 있습니다.',
    recommendTargets: ['preschool', 'elementaryLower', 'specialSupport'],
  },
  6: {
    sec: 6,
    tempoLabel: '쉬움',
    summary: '처음 경험·특수 지원·여유 있는 안내에 적합합니다.',
    reason: '시범·안내를 곁들여도 움직일 시간이 충분합니다.',
    recommendTargets: ['preschool', 'specialSupport'],
  },
};

const STORAGE_KEY = 'spokedu-master.spomove.lastCueSeconds';

/**
 * 브리핑에서 자극 속도(1~6초)를 고를 수 있는 프리셋.
 * 제외: DIVE, 숫자 연산 기차, 흰 공, 레거시 reactTrain 매직 아이, 순차 기억(순간 기억 제외)
 * 순간 기억(spatial 7): 자극 속도 = 첫 그리드 기억 시간
 * 골키퍼(10)는 비행 시간(초)으로 cueSeconds를 사용한다.
 */
export function supportsCueSpeedOverride(preset: OfficialSpomovePreset): boolean {
  if (preset.programGroup === 'dive' || preset.programGroup === 'bonus') return false;
  // 순차 기억 · 순간 기억만 자극 속도(기억 시간) 허용
  if (preset.engine.mode === 'spatial' && preset.engine.level === 7) return true;
  if (preset.programGroup === 'sequential-memory') return false;
  if (preset.engine.mode === 'spatial') return false;
  if (preset.engine.mode === 'flow') return false;
  if (preset.engine.mode === 'reactTrain') {
    const level = preset.engine.level;
    // 레거시 5 매직 아이 · 8 숫자 연산 기차 · 9 흰 공 (7 소행성은 카탈로그 삭제·딥링크만)
    if (level === 5 || level === 7 || level === 8 || level === 9) return false;
  }
  return true;
}

export function clampCueSpeedSec(value: number): SpomoveCueSpeedSec {
  const rounded = Math.round(value);
  if ((SPOMOVE_CUE_SPEED_OPTIONS as readonly number[]).includes(rounded)) {
    return rounded as SpomoveCueSpeedSec;
  }
  if (rounded < 1) return 1;
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
  return readLastCueSeconds(3);
}

/**
 * Wave 2 cue 우선순위:
 * 유효 URL cueSeconds → 마지막 저장 → 프리셋 기본
 * 세션 브리핑에서는 동작과 무관하게 1~6초를 직접 선택한다.
 */
export function resolveSessionCueSeconds(
  preset: OfficialSpomovePreset,
  urlCueSeconds?: number | null,
): SpomoveCueSpeedSec {
  if (urlCueSeconds != null && Number.isFinite(urlCueSeconds)) {
    return clampCueSpeedSec(urlCueSeconds);
  }
  return resolveInitialCueSeconds(preset);
}

export function parseCueSecondsQuery(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getCueSpeedGuide(sec: number): SpomoveCueSpeedGuide {
  return SPOMOVE_CUE_SPEED_GUIDES[clampCueSpeedSec(sec)];
}

export function getCueSpeedDifficultyLabel(sec: number): '쉬움' | '보통' | '어려움' {
  const value = clampCueSpeedSec(sec);
  if (value >= 5) return '쉬움';
  if (value >= 3) return '보통';
  return '어려움';
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
