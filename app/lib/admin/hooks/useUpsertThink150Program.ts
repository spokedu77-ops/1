'use client';

/**
 * Think 150 주차별 프로그램 저장 (N주차 저장 시 warmup_programs_composite에 upsert)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import type { Audience } from '@/app/lib/admin/constants/thinkTiming';

const THINK150_PROGRAMS = [
  { id: 'think150_week1', title: 'Think 150 - 1주차', description: '150초 SPOKEDU Think (같은 색 k개 = k번 점프)', week: 1 },
  { id: 'think150_week2', title: 'Think 150 - 2주차', description: '150초 SPOKEDU Think (두 색 = 왼발/오른발 동시 착지)', week: 2 },
  { id: 'think150_week3', title: 'Think 150 - 3주차', description: '150초 SPOKEDU Think (ANTI 대각선)', week: 3 },
  { id: 'think150_week4', title: 'Think 150 - 4주차', description: '150초 SPOKEDU Think (MEMORY 순서 기억)', week: 4 },
];

export interface UpsertThink150Payload {
  week: 1 | 2 | 3 | 4;
  audience: Audience;
  month?: number;
}

export function useUpsertThink150Program() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertThink150Payload) => {
      const p = THINK150_PROGRAMS[payload.week - 1];
      if (!p) throw new Error(`Invalid week: ${payload.week}`);
      const supabase = getSupabaseBrowserClient();
      const config: { week: number; audience: Audience; month?: number } = {
        week: payload.week,
        audience: payload.audience,
      };
      if (payload.month != null) config.month = payload.month;
      const phases = [
        { type: 'think', content_type: 'think150', duration: 150, config },
      ];
      const { error } = await supabase.from('warmup_programs_composite').upsert(
        {
          id: p.id,
          week_id: 'template',
          title: p.title,
          description: p.description,
          total_duration: 150,
          phases,
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warmup-programs-list'] });
    },
  });
}
