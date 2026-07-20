import type { OfficialSpomovePreset } from '../officialSpomovePresets';

/** Hub 렌더와 커버리지 테스트가 공유하는 노출 정의 */
export function isHubVisiblePreset(preset: OfficialSpomovePreset) {
  return preset.isReady === true;
}
