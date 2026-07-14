import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reportError } = vi.hoisted(() => ({
  reportError: vi.fn(),
}));

vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  reportError,
}));

import { POST } from './route';

function requestJson(body: unknown) {
  return new Request('http://local/api/auth/login-ux', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('login UX reporting route', () => {
  beforeEach(() => {
    reportError.mockClear();
    reportError.mockResolvedValue(undefined);
  });

  it('reports allowed login UX events with safe tags only', async () => {
    const response = await POST(requestJson({
      event: 'auto_redirect_from_login',
      pathname: '/login',
      redirectPath: '/spokedu-master/dashboard',
      activeTab: 'master',
      email: 'do-not-send',
    }));

    expect(response.status).toBe(204);
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      context: 'auth.login_ux',
      tags: {
        source: 'login_ux',
        event: 'auto_redirect_from_login',
        pathname: '/login',
        redirectPath: '/spokedu-master/dashboard',
        activeTab: 'master',
      },
    });
  });

  it('rejects unknown events', async () => {
    const response = await POST(requestJson({ event: 'login_confusion' }));
    expect(response.status).toBe(400);
    expect(reportError).not.toHaveBeenCalled();
  });
});
