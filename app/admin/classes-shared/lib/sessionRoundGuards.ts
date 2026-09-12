import { getBundleTitleKey } from '@/app/admin/classes/lib/v2BundleResolve';

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

type CrossGroupSlotRow = SlotConflictRow & { title?: string | null };

/**
 * 같은 강사·같은 시각으로 가져온 행이, 다른 사이클의 같은 현장(정제 수업명)인지.
 * DB title에 회차/괄호가 남아 있어도 번들 키와 같으면 충돌이다.
 */
export function isCrossGroupSlotConflictRow(
  row: { group_id?: string | null; status?: string | null; title?: string | null },
  params: { title: string; excludeGroupId?: string }
): boolean {
  const st = String(row.status ?? '');
  if (st === 'cancelled' || st === 'deleted') return false;
  if (params.excludeGroupId && row.group_id === params.excludeGroupId) return false;
  const titleKey = getBundleTitleKey(params.title);
  if (!titleKey) return false;
  return getBundleTitleKey(String(row.title ?? '')) === titleKey;
}

/**
 * 다른 group_id인데 같은 강사·같은 수업(정제명)·같은 시작 시각에 활성 슬롯이 있으면 충돌.
 * (구 사이클 + 신 사이클이 5/30에 겹치는 케이스 방지)
 *
 * SQL은 created_by + start_at 만 좁힌다. 원문 title 동등은 쓰지 않는다.
 * 회차가 제목에 붙은 구 데이터와, 재시작이 넣는 정제 제목이 달라도 같은 현장으로 본다.
 */
export async function findCrossGroupSlotConflicts(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          in: (col2: string, vals: string[]) => Promise<{ data: CrossGroupSlotRow[] | null; error: unknown }>;
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
    .in('start_at', uniqueStarts);

  if (error) throw error;

  return (data || []).filter((row) => isCrossGroupSlotConflictRow(row, { title, excludeGroupId }));
}
