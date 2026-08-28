import type { SupabaseClient } from '@supabase/supabase-js';

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
