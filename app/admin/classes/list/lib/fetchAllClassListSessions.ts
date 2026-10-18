export const CLASS_LIST_SESSION_PAGE_SIZE = 1000;

export type ClassListSessionRow = {
  id: string;
  group_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  status: string | null;
  created_by: string | null;
  round_total: number | null;
  round_index: number | null;
};

type SessionsClient = {
  from: (table: 'sessions') => {
    select: (columns: string) => {
      not: (column: string, operator: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          range: (from: number, to: number) => Promise<{ data: ClassListSessionRow[] | null; error: unknown }>;
        };
      };
    };
  };
};

const COLUMNS = 'id, group_id, title, start_at, end_at, status, created_by, round_total, round_index';

/** Stable keyset-equivalent offset pages; the admin snapshot is deduped by id. */
export async function fetchAllClassListSessions(client: SessionsClient): Promise<ClassListSessionRow[]> {
  const rows = new Map<string, ClassListSessionRow>();
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from('sessions')
      .select(COLUMNS)
      .not('status', 'in', '("deleted")')
      .order('id', { ascending: true })
      .range(from, from + CLASS_LIST_SESSION_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    for (const row of page) rows.set(row.id, row);
    if (page.length < CLASS_LIST_SESSION_PAGE_SIZE) break;
    from += CLASS_LIST_SESSION_PAGE_SIZE;
  }

  return Array.from(rows.values());
}
