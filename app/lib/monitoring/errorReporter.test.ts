import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportError } from './errorReporter';

describe('reportError', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.SPOKEDU_MONITORING_WEBHOOK_URL;
  });

  it('does not throw when monitoring env is missing', async () => {
    await expect(reportError(new Error('private memo text'), {
      context: 'spokedu_master.client',
    })).resolves.toBeUndefined();
  });

  it('sends sanitized tags without secrets or raw error messages', async () => {
    process.env.SPOKEDU_MONITORING_WEBHOOK_URL = 'https://monitoring.example.test/hook';
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await reportError(new Error('student memo password token payment-key-raw'), {
      context: 'spokedu_master.payment.confirm',
      tags: {
        route: 'confirm',
        provider: 'tosspayments',
        plan: 'pro',
        paymentKey: 'payment-key-raw',
        studentMemo: 'student private memo',
        status: 500,
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;

    expect(body).toMatchObject({
      service: 'spokedu-master',
      context: 'spokedu_master.payment.confirm',
      errorName: 'Error',
    });
    expect(JSON.stringify(body)).not.toContain('student memo password token payment-key-raw');
    expect(JSON.stringify(body)).not.toContain('payment-key-raw');
    expect(JSON.stringify(body)).not.toContain('student private memo');
    expect(body).toHaveProperty('errorHash');
    expect(body).not.toHaveProperty('stack');
  });

  it('does not break callers when the reporter endpoint fails', async () => {
    process.env.SPOKEDU_MONITORING_WEBHOOK_URL = 'https://monitoring.example.test/hook';
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    await expect(reportError(new Error('safe failure'), {
      context: 'spokedu_master.operational.students',
    })).resolves.toBeUndefined();
  });
});
