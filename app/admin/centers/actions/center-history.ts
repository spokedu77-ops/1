'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import type { CenterHistoryEntry } from '@/app/lib/centers/types';

export async function getCenterHistory(centerId: string): Promise<CenterHistoryEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_history')
    .select('id, center_id, created_at, body, created_by')
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as CenterHistoryEntry[];
}

export async function addCenterHistoryEntry(
  centerId: string,
  body: string
): Promise<{ error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: '내용을 입력해 주세요.' };
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from('center_history').insert({
    center_id: centerId,
    body: trimmed,
    created_by: user?.id ?? null,
  });
  if (error) return { error: error.message };
  return {};
}
