'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { createCenterLogSchema, updateCenterLogSchema } from '@/app/lib/centers/schemas';
import type { CenterLog } from '@/app/lib/centers/types';

export async function listLogs(centerId: string): Promise<CenterLog[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_logs')
    .select('*')
    .eq('center_id', centerId)
    .order('log_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CenterLog[];
}

export async function createLog(input: unknown): Promise<{ data?: CenterLog; error?: string }> {
  const parsed = createCenterLogSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_logs')
    .insert({
      center_id: parsed.data.center_id,
      log_date: parsed.data.log_date ?? new Date().toISOString().slice(0, 10),
      type: parsed.data.type ?? 'note',
      content: parsed.data.content,
      next_action: parsed.data.next_action ?? null,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as CenterLog };
}

export async function updateLog(
  id: string,
  input: unknown
): Promise<{ data?: CenterLog; error?: string }> {
  const parsed = updateCenterLogSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.log_date !== undefined) payload.log_date = parsed.data.log_date;
  if (parsed.data.type !== undefined) payload.type = parsed.data.type;
  if (parsed.data.content !== undefined) payload.content = parsed.data.content;
  if (parsed.data.next_action !== undefined) payload.next_action = parsed.data.next_action;

  const { data, error } = await supabase
    .from('center_logs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as CenterLog };
}

export async function deleteLog(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('center_logs').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}
