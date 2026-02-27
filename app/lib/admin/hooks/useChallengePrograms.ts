'use client';

/**
 * 챌린지 프로그램 목록 조회 (warmup_programs_composite에서 challenge_* 로드)
 * 새로고침 시 저장된 그리드/이미지 복원용
 */

import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

export type ChallengeProgramSnapshot = {
  weekKey: string;
  title: string;
  bpm: number;
  level: number;
  grid: string[];
  /** 1~4단계 그리드 전체 (없으면 grid만 사용) */
  gridsByLevel?: Record<number, string[]>;
};

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

export function useChallengePrograms() {
  return useQuery({
    queryKey: ['challenge-programs'],
    queryFn: async (): Promise<ChallengeProgramSnapshot[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('warmup_programs_composite')
        .select('id, week_id, title, phases')
        .like('id', 'challenge_%');
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
      return list;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
