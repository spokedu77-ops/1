import { formatRoundDisplay } from './roundFields';
import { resolvePlannedTotal } from './plannedRoundTotal';

export type SessionRowForReindex = {
  id: string;
  start_at: string;
  status?: string | null;
  round_total?: number | null;
  round_index?: number | null;
};

export type GroupRoundIndexPatch = {
  id: string;
  round_index: number;
  round_total: number;
  sequence_number: number;
  round_display: string;
};

function assertUpdatedRow(data: { id?: string } | null, error: unknown, fallback: string) {
  if (error) throw error;
  if (!data?.id) throw new Error(fallback);
}

function statusOf(row: SessionRowForReindex): string {
  return String(row.status ?? '');
}

/** postponed(고스트)·deleted는 번호에서 제외. cancelled는 패키지 칸이므로 자리를 차지한다. */
function occupiesRoundSlot(row: SessionRowForReindex): boolean {
  const st = statusOf(row);
  return st !== 'postponed' && st !== 'deleted';
}

function startAtMs(row: SessionRowForReindex): number {
  const t = new Date(row.start_at).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** postponed·deleted를 뺀 칸 수. cancelled는 포함한다. */
export function occupyingRoundCount(sessions: SessionRowForReindex[]): number {
  return sessions.filter(occupiesRoundSlot).length;
}

/**
 * 날짜순 회차 번호. 취소 칸을 건너뛰고 활성만 1..N으로 압축하지 않는다.
 * 예: 3/8 cancelled → 다음 행은 4/8, 마지막은 8/8.
 * `options.total`은 사이클 합치기처럼 분모를 칸 수로 다시 잡을 때 쓴다.
 */
export function planGroupRoundIndexes(
  sessions: SessionRowForReindex[],
  options?: { total?: number }
): GroupRoundIndexPatch[] {
  const ranked = [...sessions]
    .filter(occupiesRoundSlot)
    .sort((a, b) => {
      const dt = startAtMs(a) - startAtMs(b);
      if (dt !== 0) return dt;
      const ia = typeof a.round_index === 'number' && Number.isFinite(a.round_index) ? a.round_index : 0;
      const ib = typeof b.round_index === 'number' && Number.isFinite(b.round_index) ? b.round_index : 0;
      if (ia !== ib) return ia - ib;
      return String(a.id).localeCompare(String(b.id));
    });

  if (ranked.length <= 1) return [];

  const total =
    typeof options?.total === 'number' && Number.isFinite(options.total) && options.total > 0
      ? Math.floor(options.total)
      : resolvePlannedTotal(sessions);
  return ranked.map((row, i) => {
    const round_index = i + 1;
    return {
      id: row.id,
      round_index,
      round_total: total,
      sequence_number: round_index,
      round_display: formatRoundDisplay(round_index, total),
    };
  });
}

/** group_id 내 회차를 start_at 순으로 번호 반영. 총회차는 resolvePlannedTotal. */
export async function reindexGroupRounds(
  supabase: {
    from: (table: string) => {
      update: (patch: Record<string, unknown>) => {
        eq: (
          col: string,
          id: string
        ) => {
          select: (cols: string) => {
            maybeSingle: () => Promise<{ data: { id?: string } | null; error: unknown }>;
          };
        };
      };
    };
  },
  sessions: SessionRowForReindex[],
  options?: { total?: number }
): Promise<number> {
  const patches = planGroupRoundIndexes(sessions, options);
  if (patches.length === 0) return 0;

  await Promise.all(
    patches.map(async (patch) => {
      const { id, ...fields } = patch;
      const { data, error } = await supabase
        .from('sessions')
        .update(fields)
        .eq('id', id)
        .select('id')
        .maybeSingle();
      assertUpdatedRow(data, error, 'REINDEX_ROUND_NOT_UPDATED');
    })
  );

  return patches.length;
}
