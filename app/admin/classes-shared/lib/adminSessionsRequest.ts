type SessionsPayload<T> = { sessions?: T[]; error?: string };

const inFlightSessionRequests = new Map<string, Promise<unknown[]>>();

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
export function fetchAdminSessions<T>(params: URLSearchParams): Promise<T[]> {
  const query = canonicalSessionParams(params);
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
