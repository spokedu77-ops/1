import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemoBlockType } from './types';

export async function resolveUserDisplayNames(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', unique);
  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const label = (typeof row.name === 'string' && row.name.trim()) || row.email || row.id;
    map.set(row.id, label);
  }
  return map;
}

export async function nextPageOrderIndex(
  supabase: SupabaseClient,
  parentId: string | null,
): Promise<number> {
  let query = supabase
    .from('admin_memos')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1);
  query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const max = data?.[0]?.order_index;
  return typeof max === 'number' ? max + 1 : 0;
}

export async function nextBlockOrderIndex(
  supabase: SupabaseClient,
  memoId: string,
  parentBlockId: string | null,
): Promise<number> {
  let query = supabase
    .from('admin_memo_blocks')
    .select('order_index')
    .eq('memo_id', memoId)
    .order('order_index', { ascending: false })
    .limit(1);
  query = parentBlockId
    ? query.eq('parent_block_id', parentBlockId)
    : query.is('parent_block_id', null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const max = data?.[0]?.order_index;
  return typeof max === 'number' ? max + 1 : 0;
}

export async function assertToggleParent(
  supabase: SupabaseClient,
  memoId: string,
  parentBlockId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('admin_memo_blocks')
    .select('id, memo_id, type, parent_block_id')
    .eq('id', parentBlockId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: '부모 블록을 찾을 수 없습니다.' };
  if (data.memo_id !== memoId) return { ok: false, error: '다른 페이지의 블록입니다.' };
  if (data.type !== 'toggle') return { ok: false, error: '토글 블록 안에만 넣을 수 있습니다.' };
  if (data.parent_block_id) return { ok: false, error: '토글 안 토글은 지원하지 않습니다.' };
  return { ok: true };
}

export function isValidChildBlockType(type: string): type is 'text' | 'checklist' {
  return type === 'text' || type === 'checklist';
}

export function isValidBlockType(type: string): type is MemoBlockType {
  return type === 'text' || type === 'checklist' || type === 'toggle';
}

/** 페이지 parent 이동 시 자손으로 가는지 검사 */
export async function wouldCreatePageCycle(
  supabase: SupabaseClient,
  pageId: string,
  newParentId: string | null,
): Promise<boolean> {
  if (!newParentId || newParentId === pageId) return newParentId === pageId;

  const { data, error } = await supabase.from('admin_memos').select('id, parent_id');
  if (error) throw new Error(error.message);

  const parentById = new Map((data ?? []).map((r) => [r.id as string, r.parent_id as string | null]));
  let cursor: string | null = newParentId;
  while (cursor) {
    if (cursor === pageId) return true;
    cursor = parentById.get(cursor) ?? null;
  }
  return false;
}
