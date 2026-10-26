import type { MasterClassRecordDto } from '../types/legacyOperational';
import { invalidateMasterValueSummary } from './masterValueSummaryEvents';

export type CaptureLoadResult = { status: 'loaded'; data: MasterClassRecordDto[] } | { status: 'error'; message: string };
const inFlight = new Map<string, Promise<CaptureLoadResult>>();
const CAPTURE_CHANGED_EVENT = 'spokedu-master:session-capture-changed';

export class SessionCaptureConflictError extends Error {
  constructor() {
    super('Session capture changed elsewhere');
    this.name = 'SessionCaptureConflictError';
  }
}

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

export function subscribeSessionCaptureChanges(sessionId: string, listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const localListener = (event: Event) => {
    if ((event as CustomEvent<string>).detail === sessionId) listener();
  };
  window.addEventListener(CAPTURE_CHANGED_EVENT, localListener);
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CAPTURE_CHANGED_EVENT);
  if (channel) channel.onmessage = (event) => { if (event.data === sessionId) listener(); };
  return () => {
    window.removeEventListener(CAPTURE_CHANGED_EVENT, localListener);
    channel?.close();
  };
}

function announceSessionCaptureChange(sessionId: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CAPTURE_CHANGED_EVENT, { detail: sessionId }));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(CAPTURE_CHANGED_EVENT);
    channel.postMessage(sessionId);
    channel.close();
  }
}

export async function saveSessionCapture(input: {
  sessionId: string;
  expectedVersion: number | null;
  nextSessionNote: string;
  observationChanges: Array<{ studentId: string; memo: string | null }>;
}) {
  const response = await fetch('/api/spokedu-master/session-captures', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
  if (response.status === 409) throw new SessionCaptureConflictError();
  if (!response.ok) throw new Error('기록을 저장하지 못했습니다.');
  const result = await response.json() as { data: MasterClassRecordDto };
  invalidateSessionCaptureCache();
  invalidateMasterValueSummary();
  announceSessionCaptureChange(input.sessionId);
  return result.data;
}
