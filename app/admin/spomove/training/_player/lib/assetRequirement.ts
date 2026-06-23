/**
 * 모드·레벨·테마 조합별 이미지 에셋 요구사항 및 실제 readiness 판정.
 *
 * signals.ts의 generateSignal 로직을 그대로 반영한다:
 *   level 3 (full_color):  최소 1장 (없으면 색 폴백 — UI에서 차단)
 *   level 4 (tier3):       unique 2장 이상 + 다른 색상 2가지 이상
 *   level 5 (tier2):       unique 1장 이상
 *   level 6 (tier4):       unique 3장 이상 + 다른 색상 3가지 이상
 */

import type { SpomoveColorThemeId } from './spomoveVariantThemeConfig';
import { type FruitSlide, uniqueSlidesByImageUrl, hasDistinctSlideColors } from './signals';

// ── 로딩 상태 (hook에서 re-export) ──────────────────────────────────────────

export type AssetLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

// ── AssetRequirement ─────────────────────────────────────────────────────────

export type AssetRequirement = {
  /** 훈련 시작에 필요한 최소 고유 슬라이드 수 (0 = 이미지 불필요) */
  minimumCount: number;
  /** imageUrl 기준 고유 슬라이드가 필요한지 */
  requiresDistinctImages: boolean;
  /** colorId가 서로 달라야 하는지 */
  requiresDistinctColors: boolean;
};

const NO_REQUIREMENT: AssetRequirement = {
  minimumCount: 0,
  requiresDistinctImages: false,
  requiresDistinctColors: false,
};

export function getAssetRequirement(params: {
  mode: string;
  level: number;
  theme: SpomoveColorThemeId;
}): AssetRequirement {
  const { mode, level, theme } = params;

  // color 테마: 이미지 없이 색상 신호만 사용
  if (theme === 'color') return NO_REQUIREMENT;
  // basic 외 모드: 이미지 미사용
  if (mode !== 'basic') return NO_REQUIREMENT;
  // level 1: arrow — 이미지 미사용
  if (level === 1) return NO_REQUIREMENT;
  // level 2: think_quad — non-color 테마에서 이미지 1장 사용, 없으면 색 폴백
  if (level === 2) {
    return { minimumCount: 1, requiresDistinctImages: false, requiresDistinctColors: false };
  }

  // level 3 (full_color): 1장 선호, 없으면 UI에서 차단
  // signals.ts: r(vSlides.filter(s => s.imageUrl.trim())) — 비어 있으면 색 폴백
  if (level === 3) {
    return { minimumCount: 1, requiresDistinctImages: false, requiresDistinctColors: false };
  }

  // level 4 (tier3): uniqueSlidesByImageUrl 후 2장 + distinctColors(2)
  // signals.ts: pool.length >= 2 && hasDistinctSlideColors(pool, 2)
  if (level === 4) {
    return { minimumCount: 2, requiresDistinctImages: true, requiresDistinctColors: true };
  }

  // level 5 (tier2): uniqueSlidesByImageUrl 후 1장
  // signals.ts: pool.length >= 1
  if (level === 5) {
    return { minimumCount: 1, requiresDistinctImages: false, requiresDistinctColors: false };
  }

  // level 6 (tier4): uniqueSlidesByImageUrl 후 3장 + distinctColors(3)
  // signals.ts: pool.length >= 3 && hasDistinctSlideColors(pool, 3)
  if (level === 6) {
    return { minimumCount: 3, requiresDistinctImages: true, requiresDistinctColors: true };
  }

  return NO_REQUIREMENT;
}

// ── AssetReadiness ────────────────────────────────────────────────────────────

/** TrainingSlide는 FruitSlide의 alias. signal generator와 동일한 타입. */
export type TrainingSlide = FruitSlide;

export type AssetReadiness =
  | { status: 'ready';       usableAssets: TrainingSlide[]; requirement: AssetRequirement; }
  | { status: 'loading';     usableAssets: TrainingSlide[]; requirement: AssetRequirement; }
  | { status: 'insufficient'; usableAssets: TrainingSlide[]; requirement: AssetRequirement; missingCount: number; }
  | { status: 'error';       usableAssets: TrainingSlide[]; requirement: AssetRequirement; error: string; };

/**
 * 실제 슬라이드와 로딩 상태를 바탕으로 훈련 시작 가능 여부를 판정한다.
 *
 * UI 차단 판정과 signal generator(signals.ts)가 동일한 기준을 사용하도록
 * uniqueSlidesByImageUrl / hasDistinctSlideColors 로직을 그대로 적용한다.
 *
 * 이미지 테마를 선택했는데 이미지가 부족한 경우 색상 신호로 자동 대체하지 않는다.
 * (signals.ts level3은 색 폴백이 있지만 UI 레벨에서 insufficient으로 차단한다.)
 */
export function evaluateAssetReadiness(params: {
  mode: string;
  level: number;
  theme: SpomoveColorThemeId;
  loadStatus: AssetLoadStatus;
  slides: TrainingSlide[];
  failedAssetIds?: Set<string>;
}): AssetReadiness {
  const { mode, level, theme, loadStatus, slides, failedAssetIds } = params;
  const requirement = getAssetRequirement({ mode, level, theme });

  // 이미지 불필요: 항상 ready
  if (requirement.minimumCount === 0) {
    return { status: 'ready', usableAssets: [], requirement };
  }

  // 로딩 중 / 초기화 전
  if (loadStatus === 'loading' || loadStatus === 'idle') {
    return { status: 'loading', usableAssets: [], requirement };
  }

  // 네트워크 오류
  if (loadStatus === 'error') {
    return { status: 'error', usableAssets: [], requirement, error: '이미지를 불러오지 못했습니다.' };
  }

  // ── usable assets 계산 (generateSignal과 동일 로직) ──────────────────────
  // 1. 빈 URL 제거 + 로드 실패 제거
  const valid = slides.filter((s) => {
    const url = (s.imageUrl ?? '').trim();
    if (!url) return false;
    if (failedAssetIds?.has(url)) return false;
    return true;
  });
  // 2. imageUrl 기준 중복 제거 (signals.ts의 uniqueSlidesByImageUrl과 동일)
  const usableAssets = uniqueSlidesByImageUrl(valid);

  // ── 충족 여부 판정 ────────────────────────────────────────────────────────
  if (requirement.requiresDistinctColors) {
    // level 4·6: distinct color 필요 (hasDistinctSlideColors = signals.ts와 동일 함수)
    if (
      usableAssets.length < requirement.minimumCount ||
      !hasDistinctSlideColors(usableAssets, requirement.minimumCount)
    ) {
      const distinctColors = new Set(usableAssets.map((s) => s.color.id)).size;
      const effectiveUsable = Math.min(usableAssets.length, distinctColors);
      return {
        status: 'insufficient',
        usableAssets,
        requirement,
        missingCount: requirement.minimumCount - effectiveUsable,
      };
    }
  } else {
    // level 3·5: count만 확인
    if (usableAssets.length < requirement.minimumCount) {
      return {
        status: 'insufficient',
        usableAssets,
        requirement,
        missingCount: requirement.minimumCount - usableAssets.length,
      };
    }
  }

  return { status: 'ready', usableAssets, requirement };
}
