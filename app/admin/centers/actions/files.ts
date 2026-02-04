'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { createCenterFileSchema, updateCenterFileSchema } from '@/app/lib/centers/schemas';
import type { CenterFile } from '@/app/lib/centers/types';

export async function listFiles(centerId: string): Promise<CenterFile[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_files')
    .select('*')
    .eq('center_id', centerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CenterFile[];
}

export async function createFile(input: unknown): Promise<{ data?: CenterFile; error?: string }> {
  const parsed = createCenterFileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_files')
    .insert({
      center_id: parsed.data.center_id,
      title: parsed.data.title,
      url: parsed.data.url,
      category: parsed.data.category ?? null,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as CenterFile };
}

export async function updateFile(
  id: string,
  input: unknown
): Promise<{ data?: CenterFile; error?: string }> {
  const parsed = updateCenterFileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) payload.title = parsed.data.title;
  if (parsed.data.url !== undefined) payload.url = parsed.data.url;
  if (parsed.data.category !== undefined) payload.category = parsed.data.category;

  const { data, error } = await supabase
    .from('center_files')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as CenterFile };
}

export async function deleteFile(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('center_files').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}
