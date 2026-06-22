import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reportError } = vi.hoisted(() => ({
  reportError: vi.fn(),
}));

vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  reportError,
}));

import { POST } from './route';

function requestJson(body: unknown) {
  return new Request('http://local/api/spokedu-master/client-errors', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('client error reporting route', () => {
  beforeEach(() => {
    reportError.mockClear();
    reportError.mockResolvedValue(undefined);
  });

  it('reports only safe client error tags', async () => {
    const response = await POST(requestJson({
      digest: 'digest-1',
      errorName: 'RenderError',
      pathname: '/spokedu-master/students',
      password: 'do-not-send',
      studentMemo: 'private memo',
    }));

    expect(response.status).toBe(204);
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      context: 'spokedu_master.client',
      tags: {
        source: 'error_boundary',
        digest: 'digest-1',
        errorName: 'RenderError',
        pathname: '/spokedu-master/students',
      },
    });
  });

  it('rejects invalid JSON without reporting', async () => {
    const response = await POST(new Request('http://local/api/spokedu-master/client-errors', {
      method: 'POST',
      body: '{',
    }));

    expect(response.status).toBe(400);
    expect(reportError).not.toHaveBeenCalled();
  });
});
