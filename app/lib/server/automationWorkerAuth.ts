import { NextResponse } from 'next/server';

export type AutomationWorkerAuthFail = { ok: false; response: NextResponse };
export type AutomationWorkerAuthOk = { ok: true };
export type AutomationWorkerAuthResult = AutomationWorkerAuthOk | AutomationWorkerAuthFail;

/** Local n8n worker — Bearer token only; never expose Supabase service_role to n8n. */
export function isAutomationWorkerAuthorized(request: Request): boolean {
  const secret = process.env.AUTOMATION_WORKER_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export function requireAutomationWorker(request: Request): AutomationWorkerAuthResult {
  if (!isAutomationWorkerAuthorized(request)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true };
}

export function readAutomationWorkerId(request: Request): string {
  const raw = request.headers.get('x-automation-worker-id')?.trim() ?? '';
  if (raw.length >= 3 && raw.length <= 64 && /^[\w.-]+$/.test(raw)) return raw;
  return 'n8n-local';
}
