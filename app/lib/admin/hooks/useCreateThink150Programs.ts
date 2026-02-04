'use client';

/**
 * Think 150 기본 프로그램 4개 UI 생성
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/app/lib/supabase/client';

const THINK150_PROGRAMS = [
  { id: 'think150_week1', title: 'Think 150 - 1주차', description: '150초 SPOKEDU Think (같은 색 k개 = k번 점프)', week: 1 },
  { id: 'think150_week2', title: 'Think 150 - 2주차', description: '150초 SPOKEDU Think (두 색 = 왼발/오른발 동시 착지)', week: 2 },
  { id: 'think150_week3', title: 'Think 150 - 3주차', description: '150초 SPOKEDU Think (ANTI 대각선)', week: 3 },
  { id: 'think150_week4', title: 'Think 150 - 4주차', description: '150초 SPOKEDU Think (MEMORY 순서 기억)', week: 4 },
];

export function useCreateThink150Programs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient();
      for (const p of THINK150_PROGRAMS) {
        const phases = [
          { type: 'think', content_type: 'think150', duration: 150, config: { week: p.week } },
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warmup-programs-list'] });
    },
  });
}
