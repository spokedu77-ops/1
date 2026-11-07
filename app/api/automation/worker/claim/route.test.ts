import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { buildClaimContext, type FeedbackCorrectionJobRow } from '@/app/lib/server/feedbackCorrectionJobs';

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

const fields = {
  main_activity: '가상 수업에서 줄넘기 연습을 진행함.',
  strengths: '가상 학생은 동작을 꾸준히 따라 함.',
  improvements: '가상 피드백의 띄어쓰기를 다듬을 필요가 있음.',
  next_goals: '다음 가상 수업에서는 정확한 착지를 연습함.',
  condition_notes: '가상 컨디션은 양호함.',
};

function job(feedback = fields): FeedbackCorrectionJobRow {
  return {
    id: 'job-1',
    session_id: 'session-1',
    status: 'processing',
    idempotency_key: 'k',
    input_snapshot: {
      feedback_fields: feedback,
      students_text: '가상학생',
      session_type: 'virtual-e2e',
      title: '가상 피드백 교정',
      start_at: '2026-11-07T00:00:00.000Z',
    },
    correction_draft: null,
    worker_id: null,
    lease_until: null,
    attempt_count: 1,
    error_code: null,
    error_detail: null,
    requested_by: null,
    consumed_at: null,
    created_at: '2026-11-07T00:00:00.000Z',
    updated_at: '2026-11-07T00:00:00.000Z',
    started_at: null,
    completed_at: null,
  };
}

describe('buildClaimContext', () => {
  it('uses the job snapshot when the live session has no feedback', () => {
    const context = buildClaimContext(job(), { found: true, feedbackFields: {}, lessonPlanContent: null });
    expect(context.error).toBeUndefined();
    expect(context.source_feedback).toEqual(fields);
    expect(context.source_integrity).toEqual({ compared_to_session: true, source_unchanged: false });
  });

  it('keeps source_unchanged when the live session matches the snapshot', () => {
    const context = buildClaimContext(job(), { found: true, feedbackFields: fields, lessonPlanContent: null });
    expect(context.source_integrity).toEqual({ compared_to_session: true, source_unchanged: true });
  });

  it('returns SNAPSHOT_FIELDS_REQUIRED and no source when a required field is empty', () => {
    const context = buildClaimContext(job({ ...fields, main_activity: '  ' }), {
      found: true,
      feedbackFields: fields,
      lessonPlanContent: null,
    });
    expect(context.error).toBe('SNAPSHOT_FIELDS_REQUIRED');
    expect(context.source_feedback).toBeUndefined();
  });

  it('does not expose a snapshot when the session row is missing', () => {
    const context = buildClaimContext(job(), { found: false, code: 'SESSION_NOT_FOUND' });
    expect(context.error).toBe('SESSION_NOT_FOUND');
    expect(context.source_feedback).toBeUndefined();
  });
});

describe('feedback correction workflow input gate', () => {
  it('sends only non-empty source to Qwen and fails closed otherwise', () => {
    const workflow = JSON.parse(
      readFileSync(join(process.cwd(), 'ops/local-automation/workflows/spokedu-feedback-correction.json'), 'utf8'),
    ) as {
      nodes: Array<{ name: string; parameters?: { jsCode?: string } }>;
      connections: Record<string, { main: Array<Array<{ node: string }>> }>;
    };
    const code = workflow.nodes.find((node) => node.name === 'Build LLM request')?.parameters?.jsCode ?? '';
    expect(code).toContain('ctx.error');
    expect(code).toContain('skipLlm');
    expect(workflow.connections['LLM input OK?'].main[0][0].node).toBe('LM Studio chat');
    expect(workflow.connections['LLM input OK?'].main[1][0].node).toBe('Mark job failed');
  });
});
