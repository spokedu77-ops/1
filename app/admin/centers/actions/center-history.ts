'use server';

import type { CenterHistoryEntry } from '@/app/lib/centers/types';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { z } from 'zod';

const HISTORY_BODY_REQUIRED = '히스토리 내용을 입력해 주세요.';
const ADMIN_REQUIRED = '관리자 권한이 필요합니다.';
const HISTORY_NOT_UPDATED = '히스토리 수정이 반영되지 않았습니다. 권한 또는 RLS 정책을 확인해 주세요.';
const HISTORY_NOT_DELETED = '히스토리 삭제가 반영되지 않았습니다. 권한 또는 RLS 정책을 확인해 주세요.';
const uuidSchema = z.string().uuid();
const historyBodySchema = z.string().trim().min(1).max(5000);

export async function getCenterHistory(centerId: string): Promise<CenterHistoryEntry[]> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(ADMIN_REQUIRED);
  const parsedCenterId = uuidSchema.safeParse(centerId);
  if (!parsedCenterId.success) return [];
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('center_history')
    .select('id, center_id, created_at, body, created_by')
    .eq('center_id', parsedCenterId.data)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as CenterHistoryEntry[];
}

export async function addCenterHistoryEntry(
  centerId: string,
  body: string
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedCenterId = uuidSchema.safeParse(centerId);
  if (!parsedCenterId.success) return { error: '올바르지 않은 센터 ID입니다.' };
  const parsedBody = historyBodySchema.safeParse(body);
  if (!parsedBody.success) return { error: HISTORY_BODY_REQUIRED };

  const supabase = getServiceSupabase();

  const { error } = await supabase.from('center_history').insert({
    center_id: parsedCenterId.data,
    body: parsedBody.data,
    created_by: auth.userId,
  });
  if (error) return { error: error.message };
  return {};
}

export async function updateCenterHistoryEntry(
  entryId: string,
  body: string
): Promise<{ error?: string; updated?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedEntryId = uuidSchema.safeParse(entryId);
  if (!parsedEntryId.success) return { error: HISTORY_NOT_UPDATED };
  const parsedBody = historyBodySchema.safeParse(body);
  if (!parsedBody.success) return { error: HISTORY_BODY_REQUIRED };

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('center_history')
    .update({ body: parsedBody.data })
    .eq('id', parsedEntryId.data)
    .select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: HISTORY_NOT_UPDATED };
  }
  return { updated: true };
}

export async function deleteCenterHistoryEntry(entryId: string): Promise<{ error?: string; deleted?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedEntryId = uuidSchema.safeParse(entryId);
  if (!parsedEntryId.success) return { error: HISTORY_NOT_DELETED };
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('center_history')
    .delete()
    .eq('id', parsedEntryId.data)
    .select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: HISTORY_NOT_DELETED };
  }
  return { deleted: true };
}
