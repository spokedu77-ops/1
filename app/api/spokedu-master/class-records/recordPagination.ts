/**
 * Read every row from a PostgREST collection without relying on its server-side
 * max_rows default. Preserve the existing API's complete-array response contract.
 *
 * If a collection changes while pages are read, fail rather than silently return
 * an incomplete or duplicated snapshot. Callers should retry the read.
 */
export type RecordPage<T> = {
  data: T[] | null;
  count: number | null;
  error: unknown | null;
};

export async function readAllRecordPages<T extends { id: string }>(
  fetchPage: (from: number, to: number) => Promise<RecordPage<T>>,
  pageSize = 500,
): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error('Invalid record page size');
  }

  let expectedCount: number | null = null;
  const rows: T[] = [];
  const seen = new Set<string>();

  do {
    const { data, count, error } = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    if (count === null || !Number.isSafeInteger(count) || count < 0) {
      throw new Error('Record count is unavailable');
    }
    if (expectedCount !== null && count !== expectedCount) {
      throw new Error('Record collection changed during pagination');
    }
    expectedCount = count;
    const page = data ?? [];
    if (page.length > pageSize || (page.length === 0 && rows.length < expectedCount)) {
      throw new Error('Record pagination returned an incomplete page');
    }

    for (const record of page) {
      if (typeof record.id !== 'string' || !record.id || seen.has(record.id)) {
        throw new Error('Duplicate or invalid record ID during pagination');
      }
      seen.add(record.id);
      rows.push(record);
    }

    if (rows.length > expectedCount) {
      throw new Error('Record pagination exceeded the expected count');
    }
  } while (expectedCount !== null && rows.length < expectedCount);

  return rows;
}
