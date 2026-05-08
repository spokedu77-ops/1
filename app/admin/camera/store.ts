/**
 * SPOKEDU 카메라 앱 — localStorage 기반 저장소
 */

import { CAMERA_MODE_IDS, DEFAULT_SETTINGS, DIFF, STORAGE_KEY } from './constants';
import type { CameraSettings, HistoryRecord } from './types';

export interface StoredData {
  history: HistoryRecord[];
  settings: Partial<CameraSettings>;
}

function isDiffKey(value: unknown): value is CameraSettings['diff'] {
  return typeof value === 'string' && value in DIFF;
}

function normalizeDuration(value: unknown): number {
  const n = Number(value);
  return [20, 30, 60].includes(n) ? n : DEFAULT_SETTINGS.dur;
}

function normalizeSettings(raw: Partial<CameraSettings> | Record<string, unknown> | null | undefined): CameraSettings {
  return {
    diff: isDiffKey(raw?.diff) ? raw.diff : DEFAULT_SETTINGS.diff,
    dur: normalizeDuration(raw?.dur),
    multiOn: raw?.multiOn !== undefined ? Boolean(raw.multiOn) : DEFAULT_SETTINGS.multiOn,
    soundOn: raw?.soundOn !== undefined ? Boolean(raw.soundOn) : DEFAULT_SETTINGS.soundOn,
  };
}

function normalizeHistory(raw: unknown): HistoryRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .filter((item) => typeof item.mode === 'string' && CAMERA_MODE_IDS.includes(item.mode as never))
    .map((item) => ({
      date: typeof item.date === 'string' ? item.date : '',
      mode: item.mode as HistoryRecord['mode'],
      diff: isDiffKey(item.diff) ? item.diff : DEFAULT_SETTINGS.diff,
      dur: typeof item.dur === 'number' ? item.dur : normalizeDuration(item.dur),
      scores: Array.isArray(item.scores) ? item.scores.map((s) => Number(s) || 0).slice(0, 3) : [0, 0, 0],
      avgRt: typeof item.avgRt === 'number' ? item.avgRt : null,
      total: typeof item.total === 'number' ? item.total : 0,
    }));
}

function load(): StoredData {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredData>;
      return {
        history: normalizeHistory(parsed.history),
        settings: normalizeSettings(parsed.settings),
      };
    }
  } catch {
    // ignore
  }
  return { history: [], settings: { ...DEFAULT_SETTINGS } };
}

function save(data: StoredData): boolean {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

let data: StoredData = { history: [], settings: { ...DEFAULT_SETTINGS } };

export function initStore(): StoredData {
  data = load();
  return data;
}

export function getHistory(): HistoryRecord[] {
  return data.history;
}

export function getSettings(): CameraSettings {
  const settings = normalizeSettings(data.settings);
  data.settings = settings;
  return settings;
}

export function addRecord(rec: HistoryRecord): void {
  data.history.unshift(rec);
  if (data.history.length > 100) data.history = data.history.slice(0, 100);
  save(data);
}

export function saveSettings(s: Partial<CameraSettings>): boolean {
  data.settings = normalizeSettings({ ...data.settings, ...s });
  return save(data);
}

export function clearHistory(): void {
  data.history = [];
  save(data);
}

export function getBest(mode: string): number {
  const scores = data.history
    .filter((h) => h.mode === mode)
    .map((h) => h.scores[0] ?? 0);
  return scores.length ? Math.max(...scores) : 0;
}
