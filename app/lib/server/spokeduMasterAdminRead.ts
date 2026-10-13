export const MASTER_ADMIN_ID_BATCH_SIZE = 200;
export const MASTER_ADMIN_READ_PAGE_SIZE = 1000;

export function chunkMasterAdminIds<T>(values: T[], size = MASTER_ADMIN_ID_BATCH_SIZE) {
  if (!Number.isInteger(size) || size < 1) throw new Error('Invalid batch size');
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size));
}

export async function readAllMasterAdminPages<T>(input: {
  pageSize?: number;
  fetchPage: (page: number, pageSize: number) => Promise<T[]>;
}) {
  const pageSize = input.pageSize ?? MASTER_ADMIN_READ_PAGE_SIZE;
  const rows: T[] = [];
  for (let page = 1; ; page += 1) {
    const pageRows = await input.fetchPage(page, pageSize);
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return rows;
  }
}

export async function readAllMasterAdminIdRows<T>(input: {
  ids: string[];
  batchSize?: number;
  pageSize?: number;
  fetchPage: (ids: string[], from: number, to: number) => Promise<T[]>;
}) {
  const pageSize = input.pageSize ?? MASTER_ADMIN_READ_PAGE_SIZE;
  const rows: T[] = [];
  for (const ids of chunkMasterAdminIds(input.ids, input.batchSize)) {
    for (let from = 0; ; from += pageSize) {
      const pageRows = await input.fetchPage(ids, from, from + pageSize - 1);
      rows.push(...pageRows);
      if (pageRows.length < pageSize) break;
    }
  }
  return rows;
}

export function paginateMasterAdminGrantSearchRows<T extends { id: string; plan: string; created_at: string }>(input: { rows: T[]; plan: string; status: string; statusOf: (row: T) => string; page: number; pageSize?: number }) {
  const unique = [...new Map(input.rows.map((row) => [row.id, row])).values()];
  const filtered = unique.filter((row) => (input.plan === 'all' || row.plan === input.plan) && (input.status === 'all' || input.statusOf(row) === input.status)).sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at) || right.id.localeCompare(left.id));
  return paginateMasterAdminRows(filtered, input.page, input.pageSize ?? 20);
}

type GrantCandidate = { id: string; user_id: string; plan: string; starts_at: string; ends_at: string; revoked_at?: string | null };

export function selectActiveMasterAdminGrants<T extends GrantCandidate>(rows: T[], now: string) {
  const selected = new Map<string, T>();
  const rank = (plan: string) => plan === 'premium' ? 2 : plan === 'lite' ? 1 : 0;
  for (const row of [...rows].filter((candidate) =>
    !candidate.revoked_at && candidate.starts_at <= now && candidate.ends_at > now)
    .sort((left, right) => rank(right.plan) - rank(left.plan)
      || Date.parse(right.ends_at) - Date.parse(left.ends_at)
      || left.id.localeCompare(right.id))) {
    if (!selected.has(row.user_id)) selected.set(row.user_id, row);
  }
  return selected;
}

type OrderCandidate = { id?: string; order_id?: string; user_id: string; updated_at: string | null };

export function selectLatestMasterAdminOrders<T extends OrderCandidate>(rows: T[]) {
  const selected = new Map<string, T>();
  for (const row of [...rows].sort((left, right) =>
    Date.parse(right.updated_at ?? '') - Date.parse(left.updated_at ?? '')
      || (right.id ?? right.order_id ?? '').localeCompare(left.id ?? left.order_id ?? ''))) {
    if (!selected.has(row.user_id)) selected.set(row.user_id, row);
  }
  return selected;
}

export function paginateMasterAdminRows<T>(rows: T[], page: number, pageSize = 20) {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const start = (safePage - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total: rows.length, page: safePage, pageSize };
}
