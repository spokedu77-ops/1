/**
 * React Query Hooks for Warmup Programs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleSaveToDatabase, SaveOptions } from '../logic/handleSaveToDatabase';
import { GeneratedScenario } from '../types/scenario';
import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

/**
 * 웜업 프로그램 목록 조회
 */
export function useWarmupPrograms(year: number, month: number) {
  return useQuery({
    queryKey: ['warmup-programs', year, month],
    queryFn: async () => {
      const weekPattern = `${year}-${String(month).padStart(2, '0')}-W%`;
      
      const { data, error } = await supabase
        .from('warmup_programs_composite')
        .select('*')
        .like('week_id', weekPattern)
        .order('week_id', { ascending: true });
      
      if (error) throw error;
      
      // rotation_schedule과 조인하여 is_published 상태 가져오기
      if (data && data.length > 0) {
        const weekKeys = data.map(p => p.week_id).filter(Boolean);
        
        if (weekKeys.length > 0) {
          const { data: schedules } = await supabase
            .from('rotation_schedule')
            .select('week_key, is_published')
            .in('week_key', weekKeys);
          
          const scheduleMap = new Map(
            schedules?.map(s => [s.week_key, s.is_published]) || []
          );
          
          return data.map(program => ({
            ...program,
            is_published: scheduleMap.get(program.week_id) || false,
          }));
        }
      }
      
      return data || [];
    },
  });
}

/**
 * 웜업 프로그램 저장 (Mutation)
 */
export function useSaveWarmupProgram() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      scenario,
      weekId,
      options,
    }: {
      scenario: GeneratedScenario;
      weekId: string | null;
      options?: SaveOptions;
    }) => {
      return handleSaveToDatabase(scenario, weekId, options);
    },
    onSuccess: () => {
      // 관련 쿼리 무효화 (수동 refetch)
      queryClient.invalidateQueries({ queryKey: ['warmup-programs'] });
      queryClient.invalidateQueries({ queryKey: ['play-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * 저장된 시나리오 템플릿 목록 조회
 */
export function useSavedTemplates() {
  return useQuery({
    queryKey: ['play-scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('play_scenarios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
}
