/**
 * React Query Hooks for Templates
 * 템플릿 목록 조회 (week_id IS NULL)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

/**
 * 템플릿 목록 조회
 * staleTime: 5분 (실시간 아님)
 * refetchOnWindowFocus: true (포커스 시에만 갱신)
 */
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warmup_programs_composite')
        .select('id, title, description, week_id, version, created_at, updated_at')
        .eq('is_active', true)
        .is('week_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
    refetchOnMount: false, // 마운트 시 자동 refetch 비활성화
  });
}

/**
 * 템플릿 저장/수정 Mutation
 */
export function useSaveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id?: string;
      title: string;
      description?: string;
      phases: any;
      scenario_ids?: string[];
    }) => {
      const { data: result, error } = await supabase
        .from('warmup_programs_composite')
        .upsert({
          id: data.id || `template_${Date.now()}`,
          title: data.title,
          description: data.description,
          phases: data.phases,
          scenario_ids: data.scenario_ids || [],
          week_id: null, // 템플릿은 항상 week_id = null
          is_active: true,
          version: 1,
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      // 템플릿 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * 템플릿 삭제 Mutation
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('warmup_programs_composite')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
