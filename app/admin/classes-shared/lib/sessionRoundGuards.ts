import { getBundleTitleKey } from '@/app/admin/classes-v2/lib/v2BundleResolve';

export type SlotConflictRow = {
  id: string;
  group_id: string | null;
  start_at: string;
  round_display?: string | null;
  status?: string | null;
};

/** 같은 group·같은 시작 시각에 연기(postponed) 기록이 이미 있으면 true */
export async function hasDuplicatePostponedSlot(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          eq: (col2: string, val2: string) => {
            eq: (col3: string, val3: string) => {
              limit: (n: number) => Promise<{ data: { id?: string }[] | null; error: unknown }>;
            };
          };
        };
      };
    };
  },
  groupId: string,
  startAtIso: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('group_id', groupId)
    .eq('start_at', startAtIso)
    .eq('status', 'postponed')
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * 다른 group_id인데 같은 강사·같은 수업명·같은 시작 시각에 활성 슬롯이 있으면 충돌.
 * (구 사이클 + 신 사이클이 5/30에 겹치는 케이스 방지)
 */
export async function findCrossGroupSlotConflicts(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          eq: (col2: string, val2: string) => {
            in: (col3: string, vals: string[]) => Promise<{ data: SlotConflictRow[] | null; error: unknown }>;
          };
        };
      };
    };
  },
  params: {
    teacherId: string;
    title: string;
    startAtList: string[];
    excludeGroupId?: string;
  }
): Promise<SlotConflictRow[]> {
  const { teacherId, title, startAtList, excludeGroupId } = params;
  if (!teacherId || !title.trim() || startAtList.length === 0) return [];

  const uniqueStarts = [...new Set(startAtList)];
  const { data, error } = await supabase
    .from('sessions')
    .select('id, group_id, start_at, round_display, status, title')
    .eq('created_by', teacherId)
    .eq('title', title)
    .in('start_at', uniqueStarts);

  if (error) throw error;

  const titleKey = getBundleTitleKey(title);
  return (data || []).filter((row) => {
    const st = String(row.status ?? '');
    if (st === 'cancelled' || st === 'deleted') return false;
    if (excludeGroupId && row.group_id === excludeGroupId) return false;
    return getBundleTitleKey(String((row as { title?: string }).title ?? '')) === titleKey;
  }) as SlotConflictRow[];
}
