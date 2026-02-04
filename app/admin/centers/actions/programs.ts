'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { createProgramSchema, updateProgramSchema } from '@/app/lib/centers/schemas';
import type { Program } from '@/app/lib/centers/types';

export async function listPrograms(centerId: string): Promise<Program[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('center_id', centerId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Program[];
}

export async function createProgram(input: unknown): Promise<{ data?: Program; error?: string }> {
  const parsed = createProgramSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('programs')
    .insert({
      center_id: parsed.data.center_id,
      name: parsed.data.name,
      term: parsed.data.term ?? null,
      start_date: parsed.data.start_date ?? null,
      end_date: parsed.data.end_date ?? null,
      sessions_count: parsed.data.sessions_count ?? null,
      instructors: parsed.data.instructors ?? {},
      note: parsed.data.note ?? null,
      status: parsed.data.status,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as Program };
}

export async function updateProgram(
  id: string,
  input: unknown
): Promise<{ data?: Program; error?: string }> {
  const parsed = updateProgramSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.term !== undefined) payload.term = parsed.data.term;
  if (parsed.data.start_date !== undefined) payload.start_date = parsed.data.start_date;
  if (parsed.data.end_date !== undefined) payload.end_date = parsed.data.end_date;
  if (parsed.data.sessions_count !== undefined) payload.sessions_count = parsed.data.sessions_count;
  if (parsed.data.instructors !== undefined) payload.instructors = parsed.data.instructors;
  if (parsed.data.note !== undefined) payload.note = parsed.data.note;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;

  const { data, error } = await supabase
    .from('programs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as Program };
}

export async function deleteProgram(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}
