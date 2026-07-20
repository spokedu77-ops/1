import type { OfficialSpomovePreset } from '../officialSpomovePresets';

/** Hub 카드 목록에 표시되는 프리셋 (미준비 포함) */
export function isHubListedPreset(_preset: OfficialSpomovePreset) {
  return true;
}

/** 실제 실행 가능한 프리셋 */
export function isHubRunnablePreset(preset: OfficialSpomovePreset) {
  return preset.isReady === true;
}

/**
 * @deprecated isHubRunnablePreset 사용.
 * Audit·Core의 "공개 실행 대상" 분모는 runnable 기준.
 */
export function isHubVisiblePreset(preset: OfficialSpomovePreset) {
  return isHubRunnablePreset(preset);
}
