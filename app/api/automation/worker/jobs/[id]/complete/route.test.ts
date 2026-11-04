import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

const jobId = '11111111-1111-4111-8111-111111111111';
const snapshot = {
  feedback_fields: {
    main_activity: '14:00 드리블',
    strengths: '집중',
    improvements: '패스',
    next_goals: '2대1',
    condition_notes: '15:30 종료',
  },
  students_text: '',
  session_type: 'regular_private',
  title: 't',
  start_at: '2026-11-04T05:00:00.000Z',
};

function authRequest(body: unknown) {
  process.env.AUTOMATION_WORKER_SECRET = 'secret';
  return POST(
    new Request(`http://localhost/api/automation/worker/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer secret',
        'content-type': 'application/json',
        'x-automation-worker-id': 'worker-a',
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: jobId }) },
  );
}

describe('worker complete scenarios (mocked DB)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTOMATION_WORKER_SECRET;
  });

  it('9/idempotent: completed job returns 200 without RPC', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: jobId,
              session_id: jobId,
              status: 'completed',
              idempotency_key: 'k',
              input_snapshot: snapshot,
              correction_draft: snapshot.feedback_fields,
              attempt_count: 1,
              created_at: '',
              updated_at: '',
            },
            error: null,
          }),
        }),
      }),
    });
    const res = await authRequest({ correctionDraft: snapshot.feedback_fields });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.idempotent).toBe(true);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('7/stale worker: RPC JOB_WORKER_MISMATCH → 409', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: jobId,
              session_id: jobId,
              status: 'processing',
              idempotency_key: 'k',
              input_snapshot: snapshot,
              attempt_count: 2,
              worker_id: 'worker-b',
              created_at: '',
              updated_at: '',
            },
            error: null,
          }),
        }),
      }),
    });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'JOB_WORKER_MISMATCH' } });
    const res = await authRequest({ correctionDraft: snapshot.feedback_fields });
    expect(res.status).toBe(409);
  });

  it('8/reprocess: processing job from wrong state blocked at RPC', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: jobId,
              session_id: jobId,
              status: 'pending',
              idempotency_key: 'k',
              input_snapshot: snapshot,
              attempt_count: 0,
              created_at: '',
              updated_at: '',
            },
            error: null,
          }),
        }),
      }),
    });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'JOB_NOT_PROCESSING' } });
    const res = await authRequest({ correctionDraft: snapshot.feedback_fields });
    expect(res.status).toBe(409);
  });
});
