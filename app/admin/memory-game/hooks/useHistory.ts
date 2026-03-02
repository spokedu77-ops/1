'use client';

import { useState, useCallback } from 'react';
import { loadHistory, addRecord as addRecordStorage } from '../lib/storage';
import { MEMORY_ROUNDS, HISTORY_KEY } from '../constants';

export type HistoryRecord = {
  id: number;
  date: string;
  studentId: string | null;
  mode: string;
  level: number;
  count: number;
  spm: number | null;
  speed?: number;
  timeMode?: string;
  duration?: number;
  targetReps?: number;
  memo?: string | null;
};

export function useHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>(() => loadHistory() as HistoryRecord[]);

  const push = useCallback(
    (cfg: { mode: string; level: number; timeMode?: string; duration?: number; targetReps?: number; speed?: number }, count: number, studentId: string | null = null, memo = '') => {
      const isMem = cfg.mode === 'spatial';
      const totalSec = isMem ? MEMORY_ROUNDS * 10 : cfg.timeMode === 'time' ? (cfg.duration ?? 0) : (cfg.targetReps ?? 0) * (cfg.speed ?? 1);
      const spm = !isMem && totalSec > 0 ? Math.round((count / totalSec) * 60) : null;

      const record: HistoryRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        studentId,
        mode: cfg.mode,
        level: cfg.level,
        count,
        spm,
        speed: cfg.speed,
        timeMode: cfg.timeMode,
        duration: cfg.duration,
        targetReps: cfg.targetReps,
        memo: memo.trim() || null,
      };
      const next = addRecordStorage(record) as HistoryRecord[];
      setRecords(next);
      return record;
    },
    []
  );

  const clear = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(HISTORY_KEY);
    setRecords([]);
  }, []);

  return { records, push, clear };
}
