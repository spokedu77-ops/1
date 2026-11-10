import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), access: vi.fn(), rpc: vi.fn(),
}));
vi.mock('@/app/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock('@/app/lib/server/teacherAuth', () => ({ canAccessTeacherMaterials: mocks.access }));
vi.mock('@/app/lib/server/adminAuth', () => ({ getServiceSupabase: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/app/lib/logging/devLogger', () => ({ devLogger: { error: vi.fn() } }));
import { GET, POST } from './route';

const sessionId = '10000000-0000-4000-8000-000000000001';
const teacherId = '20000000-0000-4000-8000-000000000001';
const request = (body: object) => new Request('http://localhost/api/teacher/lesson-plan', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: teacherId } } });
  mocks.access.mockResolvedValue(true);
  mocks.rpc.mockResolvedValue({ data: { ok: true, lessonPlanId: 'saved' }, error: null });
});

describe('teacher lesson plan write', () => {
  it('uses only the authenticated identity in the atomic DB write', async () => {
    const response = await POST(request({ action: 'save', sessionId, teacherId: 'forged', content: '2026.11.10.(화요일) 내용' }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('teacher_write_lesson_plan', expect.objectContaining({ p_teacher_id: teacherId, p_session_id: sessionId }));
  });
  it('rejects signed-out and inactive users before privileged writes', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await POST(request({ action: 'save', sessionId, content: '내용' }))).status).toBe(401);
    mocks.access.mockResolvedValueOnce(false);
    expect((await POST(request({ action: 'save', sessionId, content: '내용' }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([['LESSON_PLAN_FORBIDDEN', 403], ['LESSON_PLAN_STALE', 409], ['LESSON_PLAN_DATE_MISMATCH', 409], ['LESSON_PLAN_DATE_REQUIRED', 400]])('returns actionable failure for %s', async (message, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message, code: '23514' } });
    const response = await POST(request({ action: 'save', sessionId, content: '내용' }));
    expect(response.status).toBe(status);
    expect((await response.json()).error).not.toContain('LESSON_PLAN_');
  });
  it('rejects deletes without a plan identity', async () => {
    expect((await POST(request({ action: 'delete', sessionId }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('scopes archive reads to the authenticated teacher and prevents caching', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const response = await GET(new Request(`http://localhost/api/teacher/lesson-plan?sessionId=${sessionId}&teacherId=forged`));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.rpc).toHaveBeenCalledWith('teacher_read_lesson_plan_history', { p_session_id: sessionId, p_teacher_id: teacherId });
  });
});
