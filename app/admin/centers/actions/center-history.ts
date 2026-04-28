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

export async function updateCenterHistoryEntry(
  entryId: string,
  body: string
): Promise<{ error?: string; updated?: boolean }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: '내용을 입력해 주세요.' };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_history')
    .update({ body: trimmed })
    .eq('id', entryId)
    .select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: '수정이 반영되지 않았습니다. (RLS 정책 미적용/캐시 미갱신일 수 있어요 — `center_history` UPDATE/DELETE 정책 적용 후 스키마 캐시 리로드 필요)' };
  }
  return { updated: true };
}

export async function deleteCenterHistoryEntry(entryId: string): Promise<{ error?: string; deleted?: boolean }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_history')
    .delete()
    .eq('id', entryId)
    .select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: '삭제가 반영되지 않았습니다. (RLS 정책 미적용/캐시 미갱신일 수 있어요 — `center_history` UPDATE/DELETE 정책 적용 후 스키마 캐시 리로드 필요)' };
  }
  return { deleted: true };
}
