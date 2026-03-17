'use client';

/**
 * 챌린지 프로그램 목록 조회 (warmup_programs_composite에서 challenge_* 로드)
 * 새로고침 시 저장된 그리드/이미지 복원용.
 * warmup_programs_composite 조회가 느릴 수 있어, sessionStorage 캐시를 placeholder로 써서 즉시 표시 후 백그라운드에서 재검증.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

export const CHALLENGE_PROGRAMS_CACHE_KEY = 'challenge-programs-cache';
const CACHE_KEY = CHALLENGE_PROGRAMS_CACHE_KEY;

export type ChallengeProgramSnapshot = {
  weekKey: string;
  title: string;
  bpm: number;
  level: number;
  grid: string[];
  /** 1~4단계 그리드 전체 (없으면 grid만 사용) */
  gridsByLevel?: Record<number, string[]>;
};

function makeWeekKeyRange(year: number): { start: string; end: string } {
  // week_id 포맷: YYYY-MM-W[1-4] (month는 0 padding)
  // 문자열 비교가 안전하도록 start/end 모두 동일 포맷 유지.
  return {
    start: `${year}-01-W1`,
    end: `${year}-12-W4`,
  };
}

function getCachedSnapshot(): ChallengeProgramSnapshot[] | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function parsePhases(phases: unknown): { bpm: number; level: number; grid: string[]; gridsByLevel?: Record<number, string[]> } | null {
  if (!Array.isArray(phases) || phases.length === 0) return null;
  const p = phases[0];
  if (!p || typeof p !== 'object') return null;
  const bpm = typeof (p as { bpm?: number }).bpm === 'number' ? (p as { bpm: number }).bpm : 100;
  const level = typeof (p as { level?: number }).level === 'number' ? (p as { level: number }).level : 1;
  const grid = Array.isArray((p as { grid?: string[] }).grid) ? (p as { grid: string[] }).grid : [];
  const rawByLevel = (p as { gridsByLevel?: Record<number, string[]> }).gridsByLevel;
  const gridsByLevel =
    rawByLevel && typeof rawByLevel === 'object'
      ? {
          1: Array.isArray(rawByLevel[1]) ? rawByLevel[1].slice(0, 8) : [],
          2: Array.isArray(rawByLevel[2]) ? rawByLevel[2].slice(0, 8) : [],
          3: Array.isArray(rawByLevel[3]) ? rawByLevel[3].slice(0, 8) : [],
          4: Array.isArray(rawByLevel[4]) ? rawByLevel[4].slice(0, 8) : [],
        }
      : undefined;
  return { bpm, level, grid, gridsByLevel };
}

export function useChallengePrograms(params?: { year?: number }) {
  const year = params?.year;
  const [cachedOnClient, setCachedOnClient] = useState<ChallengeProgramSnapshot[] | undefined>(() => getCachedSnapshot());
  useEffect(() => {
    const c = getCachedSnapshot();
    if (c?.length && !cachedOnClient?.length) setCachedOnClient(c);
  }, [cachedOnClient?.length]);

  return useQuery({
    queryKey: ['challenge-programs', year ?? null],
    queryFn: async (): Promise<ChallengeProgramSnapshot[]> => {
      const supabase = getSupabaseBrowserClient();
      const range = typeof year === 'number' ? makeWeekKeyRange(year) : null;
      let q = supabase
        .from('warmup_programs_composite')
        .select('id, week_id, title, phases')
        .like('id', 'challenge_%');

      // 범위 축소: 현재 편집 중인 연도만 가져오도록 제한 (데이터 누적 시 속도 차이가 큼)
      if (range) {
        q = q.gte('week_id', range.start).lte('week_id', range.end);
      }

      const { data, error } = await q;
      if (error) throw error;
      const list: ChallengeProgramSnapshot[] = [];
      for (const row of data ?? []) {
        const weekKey = typeof row.week_id === 'string' ? row.week_id : (row.id as string).replace(/^challenge_/, '');
        const parsed = parsePhases(row.phases);
        if (parsed && weekKey) {
          list.push({
            weekKey,
            title: typeof row.title === 'string' ? row.title : `챌린지 ${weekKey}`,
            bpm: parsed.bpm,
            level: parsed.level,
            grid: parsed.grid,
            gridsByLevel: parsed.gridsByLevel,
          });
        }
      }
      // 정렬: 드롭다운/머지 시 예측 가능하게
      list.sort((a, b) => a.weekKey.localeCompare(b.weekKey));
      try {
        if (typeof window !== 'undefined' && list.length > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        }
      } catch {
        /* ignore */
      }
      return list;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData ?? cachedOnClient,
  });
}
