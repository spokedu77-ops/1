/**
 * Flow preset localStorage 저장·불러오기·마이그레이션.
 * - v2 key: spomove_flow_presets_v2
 * - 구 key(spomove_flow_presets) 데이터를 v2로 자동 이전 후 구 key 삭제
 * - 잘못된 저장 데이터는 기본값 복구 (isValidPreset 필터)
 */

import {
  type DiveThemeId,
  normalizeDiveThemeId,
} from '@/app/lib/spomove/diveThemes';

export const FLOW_PRESETS_KEY = 'spomove_flow_presets_v2';
const FLOW_PRESETS_KEY_LEGACY = 'spomove_flow_presets';


export interface FlowPreset {
  id: string;
  name: string;
  features: string[];
  /** Hub 파노라마 환경 테마 */
  environmentTheme: DiveThemeId;
  duration: number;
}

function migratePreset(raw: Record<string, unknown>): FlowPreset | null {
  const id = raw.id;
  const name = raw.name;
  const features = raw.features;
  const duration = raw.duration;
  if (typeof id !== 'string' || !id.trim()) return null;
  if (typeof name !== 'string') return null;
  if (!Array.isArray(features) || !features.every((f) => typeof f === 'string')) return null;
  if (typeof duration !== 'number' || duration <= 0) return null;

  let environmentTheme: DiveThemeId = 'space';
  if (raw.environmentTheme !== undefined) {
    environmentTheme = normalizeDiveThemeId(raw.environmentTheme);
  } else if (raw.colorTheme === 'space') {
    environmentTheme = 'space';
  }

  return {
    id,
    name,
    features: features as string[],
    environmentTheme,
    duration,
  };
}

function parsePresets(raw: string | null): FlowPreset[] {
  try {
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item) => (item && typeof item === 'object' ? migratePreset(item as Record<string, unknown>) : null))
      .filter((p): p is FlowPreset => p !== null);
  } catch {
    return [];
  }
}

export function loadFlowPresets(): FlowPreset[] {
  if (typeof window === 'undefined') return [];

  const v2Raw = localStorage.getItem(FLOW_PRESETS_KEY);
  if (v2Raw !== null) return parsePresets(v2Raw);

  const legacyRaw = localStorage.getItem(FLOW_PRESETS_KEY_LEGACY);
  if (legacyRaw) {
    const migrated = parsePresets(legacyRaw);
    try {
      localStorage.setItem(FLOW_PRESETS_KEY, JSON.stringify(migrated));
      localStorage.removeItem(FLOW_PRESETS_KEY_LEGACY);
    } catch {
      /* ignore storage errors */
    }
    return migrated;
  }

  return [];
}

export type SavePresetResult = { success: true } | { success: false; error: string };

export function saveFlowPresets(presets: FlowPreset[]): SavePresetResult {
  if (typeof window === 'undefined') return { success: true };
  try {
    localStorage.setItem(FLOW_PRESETS_KEY, JSON.stringify(presets));
    return { success: true };
  } catch (e) {
    let error = String(e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      error = '저장 공간이 부족합니다 (QuotaExceededError)';
    } else if (e instanceof Error) {
      error = e.message;
    }
    return { success: false, error };
  }
}
