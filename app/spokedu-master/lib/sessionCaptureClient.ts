import type { MasterClassRecordDto } from '../types/legacyOperational';

export type CaptureLoadResult = { status: 'loaded'; data: MasterClassRecordDto[] } | { status: 'error'; message: string };
const inFlight = new Map<string, Promise<CaptureLoadResult>>();

export function fetchSessionCaptures(query: string): Promise<CaptureLoadResult> {
  const existing = inFlight.get(query);
  if (existing) return existing;
  const request = fetch(`/api/spokedu-master/session-captures?${query}`, { cache: 'no-store' })
    .then(async (response): Promise<CaptureLoadResult> => response.ok
      ? { status: 'loaded', data: (await response.json() as { data: MasterClassRecordDto[] }).data }
      : { status: 'error', message: '지난 수업 기록을 불러오지 못했습니다.' })
    .catch((): CaptureLoadResult => ({ status: 'error', message: '지난 수업 기록을 불러오지 못했습니다.' }))
    .finally(() => inFlight.delete(query));
  inFlight.set(query, request);
  return request;
}

export function invalidateSessionCaptureCache() {
  inFlight.clear();
}

export async function saveSessionCapture(input: { sessionId: string; nextSessionNote: string; observations: Array<{ studentId: string; memo: string }> }) {
  const response = await fetch('/api/spokedu-master/session-captures', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error('기록을 저장하지 못했습니다.');
  const result = await response.json() as { data: MasterClassRecordDto };
  invalidateSessionCaptureCache();
  return result.data;
}
