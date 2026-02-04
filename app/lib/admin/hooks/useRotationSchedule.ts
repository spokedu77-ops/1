/**
 * React Query Hooks for Rotation Schedule
 * 48주 슬롯(12개월×4주). Light(목록) / Detail(상세) 분리.
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/app/lib/supabase/client';
import { generate48WeekSlots, parseWeekKey } from '@/app/lib/admin/scheduler/dragAndDrop';

const supabase = getSupabaseClient();

export type ScheduleLightRow = {
  week_key: string;
  program_id: string | null;
  asset_pack_id: string | null;
  is_published: boolean;
  is_locked: boolean;
  programTitle?: string;
};

export type ScheduleDetailRow = ScheduleLightRow & {
  program_snapshot: any;
};

/** 월별 week_keys 추출 */
function getWeekKeysForMonth(year: number, month: number): string[] {
  return generate48WeekSlots(year)
    .filter((s) => s.month === month)
    .map((s) => s.weekKey);
}

export type UseRotationScheduleMonthOptions = {
  year: number;
  month: number;
  /** true이면 M±1 월을 백그라운드 prefetch */
  prefetchNeighbor?: boolean;
};

/**
 * 월별 Light 쿼리. 현재 월만 먼저 로드, M±1 prefetch로 TTFA 개선.
 * queryKey: ['rotation_schedule', year, month]
 */
export function useRotationScheduleMonth({
  year,
  month,
  prefetchNeighbor = true,
}: UseRotationScheduleMonthOptions) {
  const queryClient = useQueryClient();
  const weekKeys = getWeekKeysForMonth(year, month);

  const query = useQuery({
    queryKey: ['rotation_schedule', year, month],
    queryFn: async (): Promise<ScheduleLightRow[]> => {
      const { data, error } = await supabase
        .from('rotation_schedule')
        .select('week_key, program_id, asset_pack_id, is_published, is_locked')
        .in('week_key', weekKeys);

      if (error) throw error;

      const rows = (data || []) as ScheduleLightRow[];
      const programIds = rows.map((s) => s.program_id).filter(Boolean) as string[];

      if (programIds.length > 0) {
        const { data: programs } = await supabase
          .from('warmup_programs_composite')
          .select('id, title')
          .in('id', programIds);
        const programMap = new Map(
          programs?.map((p: { id: string; title: string }) => [p.id, p.title]) || []
        );
        return rows.map((schedule) => ({
          ...schedule,
          programTitle: programMap.get(schedule.program_id!),
        }));
      }
      return rows;
    },
    enabled: weekKeys.length > 0,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData ?? [],
  });

  // M±1 prefetch
  useEffect(() => {
    if (!prefetchNeighbor) return;
    const prevMonth = month > 1 ? month - 1 : 12;
    const nextMonth = month < 12 ? month + 1 : 1;
    const prevYear = month > 1 ? year : year - 1;
    const nextYear = month < 12 ? year : year + 1;

    const fetchMonth = async (y: number, m: number): Promise<ScheduleLightRow[]> => {
      const keys = getWeekKeysForMonth(y, m);
      const { data, error } = await supabase
        .from('rotation_schedule')
        .select('week_key, program_id, asset_pack_id, is_published, is_locked')
        .in('week_key', keys);
      if (error) throw error;
      const rows = (data || []) as ScheduleLightRow[];
      const ids = rows.map((s) => s.program_id).filter(Boolean) as string[];
      if (ids.length > 0) {
        const { data: programs } = await supabase
          .from('warmup_programs_composite')
          .select('id, title')
          .in('id', ids);
        const map = new Map(programs?.map((p: { id: string; title: string }) => [p.id, p.title]) || []);
        return rows.map((s) => ({ ...s, programTitle: map.get(s.program_id!) }));
      }
      return rows;
    };

    queryClient.prefetchQuery({
      queryKey: ['rotation_schedule', prevYear, prevMonth],
      queryFn: () => fetchMonth(prevYear, prevMonth),
    });
    queryClient.prefetchQuery({
      queryKey: ['rotation_schedule', nextYear, nextMonth],
      queryFn: () => fetchMonth(nextYear, nextMonth),
    });
  }, [year, month, prefetchNeighbor, queryClient]);

  return query;
}

/**
 * Light: 목록용. program_snapshot 미포함 (탭 전환/최초 진입 시 부하 감소)
 * @deprecated Scheduler는 useRotationScheduleMonth 사용. 연간 전체 조회가 필요할 때만 사용.
 */
export function useRotationScheduleLight(year: number) {
  const slots = generate48WeekSlots(year);
  const weekKeys = slots.map((s) => s.weekKey);

  return useQuery({
    queryKey: ['rotation-schedule', 'light', year],
    queryFn: async (): Promise<ScheduleLightRow[]> => {
      const { data, error } = await supabase
        .from('rotation_schedule')
        .select('week_key, program_id, asset_pack_id, is_published, is_locked')
        .in('week_key', weekKeys);

      if (error) throw error;

      const rows = (data || []) as ScheduleLightRow[];
      const programIds = rows.map((s) => s.program_id).filter(Boolean) as string[];

      if (programIds.length > 0) {
        const { data: programs } = await supabase
          .from('warmup_programs_composite')
          .select('id, title')
          .in('id', programIds);
        const programMap = new Map(
          programs?.map((p: { id: string; title: string }) => [p.id, p.title]) || []
        );
        return rows.map((schedule) => ({
          ...schedule,
          programTitle: programMap.get(schedule.program_id!),
        }));
      }
      return rows;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Detail: 클릭/상세 패널 오픈 시에만. program_snapshot 포함
 */
export function useRotationScheduleDetail(weekKey: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['rotation-schedule', 'detail', weekKey ?? ''],
    queryFn: async (): Promise<ScheduleDetailRow | null> => {
      if (!weekKey) return null;
      const { data, error } = await supabase
        .from('rotation_schedule')
        .select('week_key, program_id, asset_pack_id, is_published, is_locked, program_snapshot')
        .eq('week_key', weekKey)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      const programId = data.program_id;
      if (programId) {
        const { data: program } = await supabase
          .from('warmup_programs_composite')
          .select('id, title')
          .eq('id', programId)
          .single();
        return { ...data, programTitle: program?.title } as ScheduleDetailRow;
      }
      return data as ScheduleDetailRow;
    },
    enabled: !!weekKey && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * @deprecated Use useRotationScheduleLight. 목록용 Light 쿼리만 사용.
 */
export function useRotationSchedule(year: number) {
  return useRotationScheduleLight(year);
}

export type SaveScheduleVariables = {
  week_key: string;
  program_id: string;
  asset_pack_id?: string;
  program_snapshot: any;
  is_published?: boolean;
  is_locked?: boolean;
  programTitle?: string;
};

/**
 * 스케줄 저장/수정 Mutation (Optimistic)
 */
export function useSaveSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveScheduleVariables) => {
      const { programTitle: _t, ...payload } = data;
      const { data: result, error } = await supabase
        .from('rotation_schedule')
        .upsert(payload, {
          onConflict: 'week_key',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onMutate: async (variables) => {
      const parsed = parseWeekKey(variables.week_key);
      if (!parsed) return { previous: undefined as ScheduleLightRow[] | undefined };
      const { year, month } = parsed;

      const cacheKey = ['rotation_schedule', year, month] as const;
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<ScheduleLightRow[]>(cacheKey);
      const nextRow: ScheduleLightRow = {
        week_key: variables.week_key,
        program_id: variables.program_id,
        asset_pack_id: variables.asset_pack_id ?? null,
        is_published: variables.is_published ?? false,
        is_locked: variables.is_locked ?? false,
        programTitle: variables.programTitle
      };
      const list = previous ?? [];
      const idx = list.findIndex((r) => r.week_key === variables.week_key);
      const next = idx >= 0
        ? list.map((r, i) => (i === idx ? { ...r, ...nextRow, programTitle: nextRow.programTitle ?? r.programTitle } : r))
        : [...list, nextRow];
      queryClient.setQueryData(cacheKey, next);
      return { previous };
    },
    onError: (_err, variables, context) => {
      const parsed = parseWeekKey(variables.week_key);
      if (parsed && context?.previous != null) {
        queryClient.setQueryData(
          ['rotation_schedule', parsed.year, parsed.month],
          context.previous
        );
      }
    },
    onSettled: (data, _error, variables) => {
      const wk = data?.week_key ?? variables.week_key;
      const parsed = parseWeekKey(wk);
      if (parsed) {
        queryClient.invalidateQueries({
          queryKey: ['rotation_schedule', parsed.year, parsed.month],
        });
        queryClient.invalidateQueries({ queryKey: ['rotation-schedule', 'detail', wk] });
      }
    },
  });
}

/**
 * 스케줄 삭제 Mutation (Optimistic)
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (weekKey: string) => {
      const { error } = await supabase
        .from('rotation_schedule')
        .delete()
        .eq('week_key', weekKey);

      if (error) throw error;
    },
    onMutate: async (weekKey) => {
      const parsed = parseWeekKey(weekKey);
      if (!parsed) return { previous: undefined as ScheduleLightRow[] | undefined };

      const cacheKey = ['rotation_schedule', parsed.year, parsed.month] as const;
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<ScheduleLightRow[]>(cacheKey);
      const next = (previous ?? []).filter((r) => r.week_key !== weekKey);
      queryClient.setQueryData(cacheKey, next);
      return { previous };
    },
    onError: (_err, weekKey, context) => {
      const parsed = parseWeekKey(weekKey);
      if (parsed && context?.previous != null) {
        queryClient.setQueryData(
          ['rotation_schedule', parsed.year, parsed.month],
          context.previous
        );
      }
    },
    onSettled: (_data, _error, weekKey) => {
      const parsed = parseWeekKey(weekKey);
      if (parsed) {
        queryClient.invalidateQueries({
          queryKey: ['rotation_schedule', parsed.year, parsed.month],
        });
        queryClient.invalidateQueries({ queryKey: ['rotation-schedule', 'detail', weekKey] });
      }
    },
  });
}
