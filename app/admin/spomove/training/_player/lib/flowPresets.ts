/**
 * Flow preset localStorage 저장·불러오기·마이그레이션.
 * - v2 key: spomove_flow_presets_v2
 * - 구 key(spomove_flow_presets) 데이터를 v2로 자동 이전 후 구 key 삭제
 * - 잘못된 저장 데이터는 기본값 복구 (isValidPreset 필터)
 */

export const FLOW_PRESETS_KEY = 'spomove_flow_presets_v2';
const FLOW_PRESETS_KEY_LEGACY = 'spomove_flow_presets';

export type FlowColorTheme = 'default' | 'space' | 'neon' | 'ocean';
export type FlowVisualVariant = 'classic' | 'plus';

export interface FlowPreset {
  id: string;
  name: string;
  features: string[];
  colorTheme: FlowColorTheme;
  duration: number;
  visualVariant?: FlowVisualVariant;
}

function isValidPreset(x: unknown): x is FlowPreset {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.trim().length > 0 &&
    typeof p.name === 'string' &&
    Array.isArray(p.features) &&
    (p.features as unknown[]).every((f) => typeof f === 'string') &&
    (p.colorTheme === 'default' ||
      p.colorTheme === 'space' ||
      p.colorTheme === 'neon' ||
      p.colorTheme === 'ocean') &&
    typeof p.duration === 'number' &&
    p.duration > 0
  );
}

function parsePresets(raw: string | null): FlowPreset[] {
  try {
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(isValidPreset);
  } catch {
    return [];
  }
}

export function loadFlowPresets(): FlowPreset[] {
  if (typeof window === 'undefined') return [];

  // v2 key 우선
  const v2Raw = localStorage.getItem(FLOW_PRESETS_KEY);
  if (v2Raw !== null) return parsePresets(v2Raw);

  // 구 key → 마이그레이션
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
