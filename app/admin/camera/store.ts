/**
 * SPOKEDU 카메라 앱 — localStorage 기반 저장소
 */

import { STORAGE_KEY } from './constants';
import type { HistoryRecord } from './types';

export interface StoredData {
  history: HistoryRecord[];
  settings: Record<string, unknown>;
}

function load(): StoredData {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw) as StoredData;
  } catch {
    // ignore
  }
  return { history: [], settings: {} };
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

let data: StoredData = { history: [], settings: {} };

export function initStore(): StoredData {
  data = load();
  return data;
}

export function getHistory(): HistoryRecord[] {
  return data.history;
}

export function getSettings(): Record<string, unknown> {
  return data.settings;
}

export function addRecord(rec: HistoryRecord): void {
  data.history.unshift(rec);
  if (data.history.length > 100) data.history = data.history.slice(0, 100);
  save(data);
}

export function saveSettings(s: Record<string, unknown>): boolean {
  data.settings = { ...data.settings, ...s };
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
