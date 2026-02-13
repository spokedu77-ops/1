'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { createScheduleSchema, updateScheduleSchema } from '@/app/lib/schedules/schemas';
import type { Schedule } from '@/app/lib/schedules/types';

export type GetSchedulesFilters = {
  status?: 'active' | 'done';
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'start_date_asc' | 'start_date_desc' | 'updated_at_desc';
};

const DEFAULT_PAGE_SIZE = 50;

export async function getSchedules(filters: GetSchedulesFilters = {}): Promise<Schedule[]> {
  const supabase = await createServerSupabaseClient();
  const orderBy = filters.orderBy ?? 'start_date_asc';
  const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
  const offset = filters.offset ?? 0;

  let q = supabase
    .from('schedules')
    .select('*')
    .order('start_date', { ascending: orderBy !== 'start_date_desc', nullsFirst: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) {
    q = q.eq('status', filters.status);
  }
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    q = q.or(`title.ilike.%${term}%,note.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Schedule[];
  return rows.map(normalizeSchedule);
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('schedules').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return normalizeSchedule(data as Schedule);
}

export async function createSchedule(input: unknown): Promise<{ data?: Schedule; error?: string }> {
  const parsed = createScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      title: parsed.data.title,
      assignee: parsed.data.assignee ?? null,
      start_date: parsed.data.start_date ?? null,
      end_date: parsed.data.end_date ?? null,
      start_time: parsed.data.start_time ?? null,
      end_time: parsed.data.end_time ?? null,
      day_of_week: parsed.data.day_of_week ?? null,
      sessions_count: parsed.data.sessions_count ?? null,
      note: parsed.data.note ?? null,
      checklist: parsed.data.checklist ?? [],
      status: parsed.data.status,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: normalizeSchedule(data as Schedule) };
}

export async function updateSchedule(
  id: string,
  input: unknown
): Promise<{ data?: Schedule; error?: string }> {
  const parsed = updateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) payload.title = parsed.data.title;
  if (parsed.data.assignee !== undefined) payload.assignee = parsed.data.assignee;
  if (parsed.data.start_date !== undefined) payload.start_date = parsed.data.start_date;
  if (parsed.data.end_date !== undefined) payload.end_date = parsed.data.end_date;
  if (parsed.data.start_time !== undefined) payload.start_time = parsed.data.start_time;
  if (parsed.data.end_time !== undefined) payload.end_time = parsed.data.end_time;
  if (parsed.data.day_of_week !== undefined) payload.day_of_week = parsed.data.day_of_week;
  if (parsed.data.sessions_count !== undefined) payload.sessions_count = parsed.data.sessions_count;
  if (parsed.data.note !== undefined) payload.note = parsed.data.note;
  if (parsed.data.checklist !== undefined) payload.checklist = parsed.data.checklist;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;

  const { data, error } = await supabase
    .from('schedules')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: normalizeSchedule(data as Schedule) };
}

export async function updateScheduleField(
  id: string,
  field: keyof Pick<Schedule, 'title' | 'assignee' | 'sessions_count' | 'note' | 'status'>,
  value: string | number | null
): Promise<{ data?: Schedule; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = { [field]: value };
  const { data, error } = await supabase
    .from('schedules')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: normalizeSchedule(data as Schedule) };
}

export async function deleteSchedule(id: string): Promise<{ data?: true; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('schedules').delete().eq('id', id);
  if (error) return { error: error.message };
  return { data: true };
}

function normalizeSchedule(row: Schedule): Schedule {
  return {
    ...row,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    day_of_week: Array.isArray(row.day_of_week) ? row.day_of_week : null,
  };
}
