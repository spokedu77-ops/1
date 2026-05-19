import { resolvePlannedTotal } from './plannedRoundTotal';

export type SessionRowForReindex = {
  id: string;
  start_at: string;
  status?: string | null;
  round_total?: number | null;
  round_index?: number | null;
};

function assertUpdatedRow(data: { id?: string } | null, error: unknown, fallback: string) {
  if (error) throw error;
  if (!data?.id) throw new Error(fallback);
}

/** group_id 내 활성 회차를 start_at 순 1..N, 총회차는 resolvePlannedTotal 기준으로 DB에 반영 */
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
  sessions: SessionRowForReindex[]
): Promise<number> {
  const active = [...sessions]
    .filter((r) => !['postponed', 'cancelled', 'deleted'].includes(String(r.status ?? '')))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  if (active.length <= 1) return 0;

  const total = resolvePlannedTotal(sessions);

  await Promise.all(
    active.map(async (row, i) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({
          round_index: i + 1,
          round_total: total,
          sequence_number: i + 1,
          round_display: `${i + 1}/${total}`,
        })
        .eq('id', row.id)
        .select('id')
        .maybeSingle();
      assertUpdatedRow(data, error, 'REINDEX_ROUND_NOT_UPDATED');
    })
  );

  return active.length;
}
