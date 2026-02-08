'use client';

/**
 * 챌린지 프로그램을 warmup_programs_composite에서 삭제.
 * 스케줄러에서 해당 주차 배정을 취소할 때 사용.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/app/lib/supabase/client';

export function useDeleteChallengeProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (weekKey: string) => {
      const supabase = getSupabaseClient();
      const id = `challenge_${weekKey}`;
      const { error } = await supabase
        .from('warmup_programs_composite')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warmup-programs-list'] });
    },
  });
}
