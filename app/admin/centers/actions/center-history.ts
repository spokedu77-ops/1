'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import type { CenterHistoryEntry } from '@/app/lib/centers/types';

const HISTORY_BODY_REQUIRED = '히스토리 내용을 입력해 주세요.';
const SESSION_REQUIRED = '로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.';
const HISTORY_NOT_UPDATED = '히스토리 수정이 반영되지 않았습니다. 권한 또는 RLS 정책을 확인해 주세요.';
const HISTORY_NOT_DELETED = '히스토리 삭제가 반영되지 않았습니다. 권한 또는 RLS 정책을 확인해 주세요.';

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
  if (!trimmed) return { error: HISTORY_BODY_REQUIRED };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: SESSION_REQUIRED };

  const { error } = await supabase.from('center_history').insert({
    center_id: centerId,
    body: trimmed,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  return {};
}

export async function updateCenterHistoryEntry(
  entryId: string,
  body: string
): Promise<{ error?: string; updated?: boolean }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: HISTORY_BODY_REQUIRED };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_history')
    .update({ body: trimmed })
    .eq('id', entryId)
    .select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: HISTORY_NOT_UPDATED };
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
    return { error: HISTORY_NOT_DELETED };
  }
  return { deleted: true };
}
