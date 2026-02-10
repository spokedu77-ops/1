'use client';

/**
 * 챌린지 프로그램을 warmup_programs_composite에 upsert.
 * "이 주차로 픽스" 시 스케줄러 드롭다운에 항목이 보이도록 함.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/app/lib/supabase/client';

export interface UpsertChallengePayload {
  weekKey: string;
  title: string;
  bpm: number;
  level: number;
  grid: string[];
  /** 1~4단계 그리드 전체 (있으면 저장·구독자에 4단계 모두 반영) */
  gridsByLevel?: Record<number, string[]>;
}

const CHALLENGE_DURATION_SEC = 120;

export function useUpsertChallengeProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertChallengePayload) => {
      const supabase = getSupabaseClient();
      const id = `challenge_${payload.weekKey}`;
      const phases = [
        {
          type: 'challenge',
          content_type: 'spokedu_rhythm',
          bpm: payload.bpm,
          level: payload.level,
          grid: payload.grid,
          ...(payload.gridsByLevel && { gridsByLevel: payload.gridsByLevel }),
        },
      ];
      const { error } = await supabase.from('warmup_programs_composite').upsert(
        {
          id,
          week_id: payload.weekKey,
          title: payload.title || `챌린지 ${payload.weekKey}`,
          description: '',
          total_duration: CHALLENGE_DURATION_SEC,
          phases,
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warmup-programs-list'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-programs'] });
    },
  });
}
