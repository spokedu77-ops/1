import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: () => ({
    rpc: mocks.rpc,
    from: mocks.from,
  }),
}));

describe('POST /api/automation/worker/claim', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTOMATION_WORKER_SECRET;
  });

  it('returns 401 without worker secret', async () => {
    process.env.AUTOMATION_WORKER_SECRET = 'secret';
    const res = await POST(
      new Request('http://localhost/api/automation/worker/claim', { method: 'POST' }),
    );
    expect(res.status).toBe(401);
  });

  it('claims jobs via RPC when authorized', async () => {
    process.env.AUTOMATION_WORKER_SECRET = 'secret';
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    const res = await POST(
      new Request('http://localhost/api/automation/worker/claim', {
        method: 'POST',
        headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 2 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'admin_feedback_correction_claim_jobs',
      expect.objectContaining({ p_limit: 2 }),
    );
  });
});
