'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { createCenterSchema } from '@/app/lib/centers/schemas';
import type { Center } from '@/app/lib/centers/types';

export type GetCentersFilters = {
  search?: string;
  status?: string;
  region_tag?: string;
};

export async function getCenters(filters: GetCentersFilters = {}): Promise<Center[]> {
  const supabase = await createServerSupabaseClient();
  let q = supabase.from('centers').select('*').order('name');

  if (filters.status) {
    q = q.eq('status', filters.status);
  }
  if (filters.region_tag) {
    q = q.eq('region_tag', filters.region_tag);
  }
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    q = q.or(`name.ilike.%${term}%,address.ilike.%${term}%,contact_name.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Center[];
}

export async function getCenterById(id: string): Promise<Center | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('centers').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Center;
}

export async function createCenter(input: unknown): Promise<{ data?: Center; error?: string }> {
  const parsed = createCenterSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('centers')
    .insert({
      name: parsed.data.name,
      region_tag: parsed.data.region_tag ?? null,
      address: parsed.data.address ?? null,
      access_note: parsed.data.access_note ?? null,
      contact_name: parsed.data.contact_name ?? null,
      contact_phone: parsed.data.contact_phone ?? null,
      contact_role: parsed.data.contact_role ?? null,
      status: parsed.data.status,
      contract_start: parsed.data.contract_start ?? null,
      contract_end: parsed.data.contract_end ?? null,
      weekly_schedule: parsed.data.weekly_schedule ?? [],
      instructors_default: parsed.data.instructors_default ?? { main: null, sub: null, backup: [] },
      highlights: parsed.data.highlights ?? null,
      next_actions: parsed.data.next_actions ?? [],
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as Center };
}

export async function updateCenter(
  id: string,
  input: unknown
): Promise<{ data?: Center; error?: string }> {
  const parsed = createCenterSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.region_tag !== undefined) payload.region_tag = parsed.data.region_tag;
  if (parsed.data.address !== undefined) payload.address = parsed.data.address;
  if (parsed.data.access_note !== undefined) payload.access_note = parsed.data.access_note;
  if (parsed.data.contact_name !== undefined) payload.contact_name = parsed.data.contact_name;
  if (parsed.data.contact_phone !== undefined) payload.contact_phone = parsed.data.contact_phone;
  if (parsed.data.contact_role !== undefined) payload.contact_role = parsed.data.contact_role;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.contract_start !== undefined) payload.contract_start = parsed.data.contract_start;
  if (parsed.data.contract_end !== undefined) payload.contract_end = parsed.data.contract_end;
  if (parsed.data.weekly_schedule !== undefined) payload.weekly_schedule = parsed.data.weekly_schedule;
  if (parsed.data.instructors_default !== undefined) payload.instructors_default = parsed.data.instructors_default;
  if (parsed.data.highlights !== undefined) payload.highlights = parsed.data.highlights;
  if (parsed.data.next_actions !== undefined) payload.next_actions = parsed.data.next_actions;

  const { data, error } = await supabase
    .from('centers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as Center };
}

export async function deleteCenter(id: string): Promise<{ data?: true; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('centers').delete().eq('id', id);
  if (error) return { error: error.message };
  return { data: true };
}
