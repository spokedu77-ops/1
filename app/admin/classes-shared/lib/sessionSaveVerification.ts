const FIELDS = ['id', 'group_id', 'title', 'start_at', 'end_at', 'created_by', 'price', 'memo', 'status', 'session_type', 'round_index', 'round_total', 'sequence_number', 'round_display', 'mileage_option', 'students_text'] as const;

/** Compare stored values, allowing only equivalent timestamp serializations. */
export function persistedSessionMatches(actual: object, expected: object): boolean {
  const stored = actual as Record<string, unknown>;
  const requested = expected as Record<string, unknown>;
  return FIELDS.every(key => {
    if (!(key in requested)) return true;
    if (Object.is(stored[key], requested[key])) return true;
    if ((key === 'start_at' || key === 'end_at') && typeof stored[key] === 'string' && typeof requested[key] === 'string') {
      const a = Date.parse(stored[key]);
      const b = Date.parse(requested[key]);
      return Number.isFinite(a) && a === b;
    }
    return false;
  });
}

/** Missing, duplicate, or different returned rows must never be reported as success. */
export function assertSavedSessionRows(actual: unknown, expected: object[], code = 'SESSION_MUTATION_UNVERIFIED'): void {
  if (!Array.isArray(actual) || actual.length !== expected.length) throw new Error(code);
  const ids = actual.map(row => row?.id);
  if (ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error(code);
  for (const row of expected) {
    const requested = row as Record<string, unknown>;
    const stored = actual.find(candidate => candidate.id === requested.id);
    if (!stored || !persistedSessionMatches(stored, requested)) throw new Error(code);
  }
}
