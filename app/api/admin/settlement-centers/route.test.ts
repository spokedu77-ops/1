import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
const mock = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn(), from: vi.fn() }));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mock.auth, getServiceSupabase: mock.service }));
import { GET } from './route';
beforeEach(() => { vi.clearAllMocks(); mock.auth.mockResolvedValue({ ok: true, email: 'choijihoon@spokedu.com' }); mock.service.mockReturnValue({ from: mock.from }); });
describe('settlement operational center lookup', () => {
  it('blocks anon and non-master admins without touching service data', async () => {
    mock.auth.mockResolvedValueOnce({ ok: false, response: NextResponse.json({}, { status: 401 }) });
    expect((await GET(new Request('http://local?q=x'))).status).toBe(401);
    mock.auth.mockResolvedValueOnce({ ok: true, email: 'other@example.test' });
    expect((await GET(new Request('http://local?q=x'))).status).toBe(403);
    expect(mock.service).not.toHaveBeenCalled();
  });
  it('rejects retired lookup scopes and oversized import searches before querying', async () => {
    expect((await GET(new Request('http://local?q=x'))).status).toBe(400);
    expect((await GET(new Request(`http://local?scope=import&q=${'x'.repeat(101)}`))).status).toBe(400);
    expect(mock.from).not.toHaveBeenCalled();
  });
});
