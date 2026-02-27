/**
 * React Query Hooks for Rotation Schedule
 * 48주 슬롯(12개월×4주). Light(연간 전체) / Quarter(분기별) 분리.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { generate48WeekSlots, parseWeekKey } from '@/app/lib/admin/scheduler/dragAndDrop';

export type ScheduleLightRow = {
  week_key: string;
  program_id: string | null;
  asset_pack_id: string | null;
  is_published: boolean;
  is_locked: boolean;
  programTitle?: string;
  /** Think150 등 프로그램별 스냅샷(audience 등). Quarter 조회 시 포함 */
  program_snapshot?: unknown;
};

export type UseRotationScheduleQuarterOptions = {
  year: number;
  quarter: 1 | 2 | 3 | 4;
};

/** Q1=1~3월, Q2=4~6월, Q3=7~9월, Q4=10~12월 */
function getMonthsForQuarter(quarter: 1 | 2 | 3 | 4): number[] {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

/**
 * 분기별 Light 쿼리. 해당 분기 3개월 데이터만 로드.
 * queryKey: ['rotation_schedule', 'quarter', year, quarter]
 */
export function useRotationScheduleQuarter({
  year,
  quarter,
}: UseRotationScheduleQuarterOptions) {
  const weekKeys = useMemo(() => {
    const months = getMonthsForQuarter(quarter);
    const slots = generate48WeekSlots(year);
    return slots
      .filter((s) => months.includes(s.month))
      .map((s) => s.weekKey);
  }, [year, quarter]);

  return useQuery({
    queryKey: ['rotation_schedule', 'quarter', year, quarter] as const,
    queryFn: async (): Promise<ScheduleLightRow[]> => {
      const res = await fetch(
        `/api/admin/schedule?year=${encodeURIComponent(year)}&quarter=${encodeURIComponent(quarter)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? res.statusText);
      }
      return res.json();
    },
    enabled: weekKeys.length > 0,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData ?? [],
  });
}

/**
 * 연간 전체 Light 쿼리. 스케줄러 상단 48주 현황 테이블용.
 * program_snapshot 미포함.
 */
export function useRotationScheduleLight(year: number) {
  const slots = generate48WeekSlots(year);
  const weekKeys = slots.map((s) => s.weekKey);

  return useQuery({
    queryKey: ['rotation_schedule', 'light', year],
    queryFn: async (): Promise<ScheduleLightRow[]> => {
      const supabase = getSupabaseBrowserClient();
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
        const programMap = new Map<string, string>(
          programs?.map((p: { id: string; title: string }) => [p.id, p.title]) || []
        );
        return rows.map((schedule) => ({
          ...schedule,
          programTitle: programMap.get(schedule.program_id!) as string | undefined,
        }));
      }
      return rows;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });
}

export type SaveScheduleVariables = {
  week_key: string;
  program_id: string;
  asset_pack_id?: string;
  program_snapshot: unknown;
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
      const { programTitle: _t, ...rest } = data;
      const payload = {
        week_key: rest.week_key,
        program_id: rest.program_id,
        is_published: rest.is_published ?? false,
        program_snapshot: rest.program_snapshot ?? {},
      };
      const res = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? res.statusText);
      }
      return res.json();
    },
    onMutate: async (variables) => {
      const parsed = parseWeekKey(variables.week_key);
      if (!parsed) return { previousMonth: undefined, previousQuarter: undefined };
      const { year, month } = parsed;
      const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;

      const monthKey = ['rotation_schedule', year, month] as const;
      const quarterKey = ['rotation_schedule', 'quarter', year, quarter] as const;
      await queryClient.cancelQueries({ queryKey: monthKey });
      await queryClient.cancelQueries({ queryKey: quarterKey });

      const previousMonth = queryClient.getQueryData<ScheduleLightRow[]>(monthKey);
      const previousQuarter = queryClient.getQueryData<ScheduleLightRow[]>(quarterKey);

      const nextRow: ScheduleLightRow = {
        week_key: variables.week_key,
        program_id: variables.program_id,
        asset_pack_id: variables.asset_pack_id ?? null,
        is_published: variables.is_published ?? false,
        is_locked: variables.is_locked ?? false,
        programTitle: variables.programTitle
      };

      const updateList = (list: ScheduleLightRow[] | undefined) => {
        const arr = list ?? [];
        const idx = arr.findIndex((r) => r.week_key === variables.week_key);
        return idx >= 0
          ? arr.map((r, i) => (i === idx ? { ...r, ...nextRow, programTitle: nextRow.programTitle ?? r.programTitle } : r))
          : [...arr, nextRow];
      };

      queryClient.setQueryData(monthKey, updateList(previousMonth));
      queryClient.setQueryData(quarterKey, updateList(previousQuarter));
      return { previousMonth, previousQuarter };
    },
    onError: (_err, variables, context) => {
      const parsed = parseWeekKey(variables.week_key);
      if (!parsed || !context) return;
      const { year, month } = parsed;
      const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
      if (context.previousMonth != null) {
        queryClient.setQueryData(['rotation_schedule', year, month], context.previousMonth);
      }
      if (context.previousQuarter != null) {
        queryClient.setQueryData(['rotation_schedule', 'quarter', year, quarter], context.previousQuarter);
      }
    },
    onSettled: (data, _error, variables) => {
      const wk = data?.week_key ?? variables.week_key;
      const parsed = parseWeekKey(wk);
      if (parsed) {
        queryClient.invalidateQueries({
          queryKey: ['rotation_schedule', parsed.year, parsed.month],
        });
        const quarter = Math.ceil(parsed.month / 3) as 1 | 2 | 3 | 4;
        queryClient.invalidateQueries({
          queryKey: ['rotation_schedule', 'quarter', parsed.year, quarter],
        });
        queryClient.invalidateQueries({ queryKey: ['rotation_schedule', 'light', parsed.year] });
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
      const supabase = getSupabaseBrowserClient();
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
        const quarter = Math.ceil(parsed.month / 3) as 1 | 2 | 3 | 4;
        queryClient.invalidateQueries({
          queryKey: ['rotation_schedule', 'quarter', parsed.year, quarter],
        });
        queryClient.invalidateQueries({ queryKey: ['rotation_schedule', 'light', parsed.year] });
      }
    },
  });
}
