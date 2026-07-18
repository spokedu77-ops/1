import type { AgeGroup, ComputeResult } from '../types';

const STORAGE_KEY = 'move_report_coach_observe_history_v1';
const MAX_ITEMS = 40;

export type CoachObserveHistoryItem = {
  id: string;
  createdAt: string;
  ageGroup: AgeGroup;
  profileKey: string;
  profileTitle: string;
  catchcopy: string;
  shortTip: string;
  result: ComputeResult;
};

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `co_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readRaw(): CoachObserveHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is CoachObserveHistoryItem => {
      if (!row || typeof row !== 'object') return false;
      const r = row as CoachObserveHistoryItem;
      return (
        typeof r.id === 'string' &&
        typeof r.createdAt === 'string' &&
        typeof r.profileKey === 'string' &&
        r.result != null &&
        typeof r.result === 'object'
      );
    });
  } catch {
    return [];
  }
}

function writeRaw(items: CoachObserveHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // quota / private mode
  }
}

export function listCoachObserveHistory(): CoachObserveHistoryItem[] {
  return readRaw().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getCoachObserveHistoryItem(id: string): CoachObserveHistoryItem | null {
  return readRaw().find((x) => x.id === id) ?? null;
}

export function saveCoachObserveResult(ageGroup: AgeGroup, result: ComputeResult): CoachObserveHistoryItem {
  const item: CoachObserveHistoryItem = {
    id: createId(),
    createdAt: new Date().toISOString(),
    ageGroup,
    profileKey: result.key,
    profileTitle: result.profile.char,
    catchcopy: result.profile.catchcopy,
    shortTip: result.profile.shortTip,
    result: {
      ...result,
      displayName: '이 아이',
    },
  };
  const next = [item, ...readRaw().filter((x) => x.id !== item.id)].slice(0, MAX_ITEMS);
  writeRaw(next);
  return item;
}

export function clearCoachObserveHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function formatCoachObserveWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
