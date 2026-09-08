import { describe, expect, it } from 'vitest';

import { COLORS } from '@/app/admin/spomove/training/_player/constants';
import { generateLevel4Pattern } from '@/app/admin/spomove/training/_player/lib/signals';
import {
  COLOR_NUMBER_MEMORY_QUESTION_GUIDANCE_MOVEMENT,
  COLOR_NUMBER_MEMORY_QUESTION_GUIDANCE_VOICE,
  LEVEL4_QA_COUNT,
  LEVEL4_TOTAL,
  pickLevel4QaIndices,
  resolveColorNumberMemoryMoveTarget,
} from '@/app/admin/spomove/training/_player/lib/resolveColorNumberMemoryMoveTarget';
import { canLaunchInternalSpomoveCandidate } from './internalSpomoveCandidateAccess';
import { deriveFamilyIdForPresetId } from './movements/activityFamilies';
import { isHubListedPreset, isHubRunnablePreset } from './movements/isHubVisiblePreset';
import { findOfficialSpomovePreset, OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER } from './spomovePublicCatalogOrder';
import { getSpomovePadLayoutVariant } from './spomovePadLayout';

const PUBLIC_ID = 'sequential-memory-color-number-exp';
const CANDIDATE_ID = 'sequential-memory-color-number-movement-v2';

const OTHER_SEQUENTIAL_PUBLIC = [
  'sequential-memory-3color-09',
  'sequential-memory-5color-51',
  'sequential-memory-10color-52',
  'sequential-memory-custom-10color-exp',
  'sequential-memory-full-reveal-54',
] as const;

function publicLibrary() {
  return OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.catalogStatus !== 'hold');
}

describe('SPOMOVE 2D sequential-memory-color-number-movement-v2', () => {
  it('Public 72 유지, candidate는 카탈로그에 없음', () => {
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).toHaveLength(72);
    expect(SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER).not.toContain(CANDIDATE_ID);
    expect(publicLibrary()).toHaveLength(72);
    expect(publicLibrary().map((preset) => preset.id)).toEqual([...SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER]);
  });

  it('candidate는 HOLD / internalCandidate / movement option', () => {
    const preset = findOfficialSpomovePreset(CANDIDATE_ID);
    expect(preset).toBeTruthy();
    expect(preset?.catalogStatus).toBe('hold');
    expect(preset?.internalCandidate).toBe(true);
    expect(preset?.engine).toEqual({
      mode: 'spatial',
      level: 4,
      spatialMemoryResponse: 'movement',
    });
    expect(isHubListedPreset(preset!)).toBe(false);
    expect(isHubRunnablePreset(preset!)).toBe(false);
    expect(getSpomovePadLayoutVariant(preset!)).toBe('grid2x2');
    expect(deriveFamilyIdForPresetId(CANDIDATE_ID)).toBe('sequential-memory');
  });

  it('Public L4 engine freeze — movement option 없음', () => {
    const preset = findOfficialSpomovePreset(PUBLIC_ID);
    expect(preset?.engine).toEqual({ mode: 'spatial', level: 4 });
    expect(preset?.engine.spatialMemoryResponse).toBeUndefined();
    expect(preset?.title).toBe('랜덤 기억 · 어려움 (퀴즈)');
  });

  it('일반 구독자 direct URL 차단, Admin 허용', () => {
    const preset = findOfficialSpomovePreset(CANDIDATE_ID);
    expect(canLaunchInternalSpomoveCandidate(preset, false)).toBe(false);
    expect(canLaunchInternalSpomoveCandidate(preset, undefined)).toBe(false);
    expect(canLaunchInternalSpomoveCandidate(preset, true)).toBe(true);
    expect(canLaunchInternalSpomoveCandidate(findOfficialSpomovePreset(PUBLIC_ID), false)).toBe(true);
  });

  it('red/yellow/green/blue target는 번호가 아니라 mapping 색', () => {
    expect(resolveColorNumberMemoryMoveTarget({ num: 1, color: { id: 'red' } })).toBe('red');
    expect(resolveColorNumberMemoryMoveTarget({ num: 2, color: { id: 'yellow' } })).toBe('yellow');
    expect(resolveColorNumberMemoryMoveTarget({ num: 3, color: { id: 'green' } })).toBe('green');
    expect(resolveColorNumberMemoryMoveTarget({ num: 4, color: { id: 'blue' } })).toBe('blue');
    expect(resolveColorNumberMemoryMoveTarget({ num: 1, color: { id: 'blue' } })).toBe('blue');
    expect(resolveColorNumberMemoryMoveTarget({ number: 7, color: 'yellow' })).toBe('yellow');
  });

  it('invalid mapping → null', () => {
    expect(resolveColorNumberMemoryMoveTarget(null)).toBeNull();
    expect(resolveColorNumberMemoryMoveTarget(undefined)).toBeNull();
    expect(resolveColorNumberMemoryMoveTarget({ num: 1 })).toBeNull();
    expect(resolveColorNumberMemoryMoveTarget({ num: 1, color: null })).toBeNull();
    expect(resolveColorNumberMemoryMoveTarget({ num: 1, color: { id: 'purple' } })).toBeNull();
    expect(resolveColorNumberMemoryMoveTarget({ num: 1, color: { id: 'orange' } })).toBeNull();
    expect(resolveColorNumberMemoryMoveTarget({ num: 1, color: {} })).toBeNull();
    expect(resolveColorNumberMemoryMoveTarget({ num: 1, color: 12 })).toBeNull();
    expect(resolveColorNumberMemoryMoveTarget({ num: 1, color: { id: 3 } })).toBeNull();
  });

  it('generated Level4 mapping uses SPOMAT 4색 ID', () => {
    const items = generateLevel4Pattern();
    expect(items).toHaveLength(LEVEL4_TOTAL);
    const allowed = new Set(COLORS.map((c) => c.id));
    for (const item of items) {
      expect(allowed.has(item.color.id)).toBe(true);
      expect(resolveColorNumberMemoryMoveTarget(item)).toBe(item.color.id);
    }
  });

  it('QA_COUNT 5, 10개 중 랜덤 선택 (항상 1~5 고정 아님)', () => {
    expect(LEVEL4_QA_COUNT).toBe(5);
    expect(LEVEL4_TOTAL).toBe(10);
    const alwaysFirstFive = [0, 1, 2, 3, 4];
    const seen = new Set<string>();
    let sawNonPrefix = false;
    for (let i = 0; i < 80; i++) {
      const picked = pickLevel4QaIndices();
      expect(picked).toHaveLength(5);
      expect(new Set(picked).size).toBe(5);
      expect(picked.every((idx) => idx >= 0 && idx < 10)).toBe(true);
      seen.add(picked.join(','));
      if (picked.join(',') !== alwaysFirstFive.join(',')) sawNonPrefix = true;
    }
    expect(sawNonPrefix).toBe(true);
    expect(seen.size).toBeGreaterThan(1);
  });

  it('다른 Sequential Public engine 불변', () => {
    expect(findOfficialSpomovePreset('sequential-memory-3color-09')?.engine).toEqual({
      mode: 'spatial',
      level: 1,
    });
    expect(findOfficialSpomovePreset('sequential-memory-5color-51')?.engine).toEqual({
      mode: 'spatial',
      level: 2,
    });
    expect(findOfficialSpomovePreset('sequential-memory-10color-52')?.engine).toEqual({
      mode: 'spatial',
      level: 3,
    });
    expect(findOfficialSpomovePreset('sequential-memory-custom-10color-exp')?.engine).toEqual({
      mode: 'spatial',
      level: 7,
      colorMemoryGridSize: 4,
      colorMemoryGridMode: 'oneshot',
    });
    expect(findOfficialSpomovePreset('sequential-memory-full-reveal-54')?.engine).toEqual({
      mode: 'spatial',
      level: 7,
      colorMemoryGridSize: 3,
      colorMemoryGridMode: 'oneshot',
    });
    for (const id of OTHER_SEQUENTIAL_PUBLIC) {
      expect(findOfficialSpomovePreset(id)?.engine).not.toHaveProperty('spatialMemoryResponse');
    }
  });

  it('3×3 원샷 순간 기억은 Public 상태를 유지한다', () => {
    const preset = findOfficialSpomovePreset('sequential-memory-full-reveal-54');
    expect(preset?.catalogStatus).not.toBe('hold');
    expect(preset?.engine).toEqual({
      mode: 'spatial',
      level: 7,
      colorMemoryGridSize: 3,
      colorMemoryGridMode: 'oneshot',
    });
    expect(preset?.internalCandidate).toBeUndefined();
  });

  it('guidance 문자열은 candidate 전용 상수로 분리', () => {
    expect(COLOR_NUMBER_MEMORY_QUESTION_GUIDANCE_VOICE).toBe('학생이 먼저 말하면 정답을 확인하세요');
    expect(COLOR_NUMBER_MEMORY_QUESTION_GUIDANCE_MOVEMENT).toBe('기억한 색 패드로 이동하세요');
  });
});
