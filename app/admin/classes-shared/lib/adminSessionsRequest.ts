type SessionsPayload<T> = { sessions?: T[]; error?: string };

const inFlightSessionRequests = new Map<string, Promise<unknown[]>>();

/** A committed write invalidates reads that began before that write. */
export function invalidateAdminSessionRequests() {
  inFlightSessionRequests.clear();
}

function canonicalSessionParams(input: URLSearchParams) {
  const params = new URLSearchParams(input);
  const groupIds = params.get('groupIds');
  if (groupIds) {
    params.set('groupIds', groupIds.split(',').filter(Boolean).sort().join(','));
  }
  params.sort();
  return params.toString();
}

/** Share only concurrent identical reads. Completed reads are never cached. */
export function fetchAdminSessions<T>(params: URLSearchParams, options: { fresh?: boolean } = {}): Promise<T[]> {
  const query = canonicalSessionParams(params);
  if (options.fresh) inFlightSessionRequests.delete(query);
  const existing = inFlightSessionRequests.get(query);
  if (existing) return existing as Promise<T[]>;

  const request: Promise<T[]> = fetch(`/api/admin/classes/sessions?${query}`, {
    credentials: 'include',
    cache: 'no-store',
  }).then(async (response) => {
    const payload = (await response.json().catch(() => ({}))) as SessionsPayload<T>;
    if (!response.ok) throw new Error(payload.error || 'sessions_fetch_failed');
    return payload.sessions ?? [];
  }).finally(() => {
    if (inFlightSessionRequests.get(query) === request) inFlightSessionRequests.delete(query);
  });

  inFlightSessionRequests.set(query, request as Promise<unknown[]>);
  return request;
}
