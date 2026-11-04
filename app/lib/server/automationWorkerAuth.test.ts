import { afterEach, describe, expect, it } from 'vitest';
import { isAutomationWorkerAuthorized, requireAutomationWorker } from '@/app/lib/server/automationWorkerAuth';

const original = process.env.AUTOMATION_WORKER_SECRET;

describe('automationWorkerAuth', () => {
  afterEach(() => {
    if (original === undefined) delete process.env.AUTOMATION_WORKER_SECRET;
    else process.env.AUTOMATION_WORKER_SECRET = original;
  });

  it('denies when secret unset', () => {
    delete process.env.AUTOMATION_WORKER_SECRET;
    const req = new Request('http://localhost/api/automation/worker/claim', {
      headers: { authorization: 'Bearer anything' },
    });
    expect(isAutomationWorkerAuthorized(req)).toBe(false);
    expect(requireAutomationWorker(req).ok).toBe(false);
  });

  it('accepts exact Bearer token', () => {
    process.env.AUTOMATION_WORKER_SECRET = 'test-worker-secret';
    const req = new Request('http://localhost/api/automation/worker/claim', {
      headers: { authorization: 'Bearer test-worker-secret' },
    });
    expect(isAutomationWorkerAuthorized(req)).toBe(true);
    expect(requireAutomationWorker(req).ok).toBe(true);
  });
});
