import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import seed from '@/app/lib/field-records/approved-seed.json';
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), from: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: mocks.requireAdmin, getServiceSupabase: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
import { GET, POST } from './route';
import { PUT } from './[id]/route';
import { POST as upload } from './media/route';
import { GET as previewMedia, DELETE as deleteMedia } from './media/[id]/route';
import { POST as importSeed } from './seed/route';
const id = '11111111-1111-4111-8111-111111111111';
const context = { params: Promise.resolve({ id }) };
const request = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/admin/field-records', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({ ok: true, userId: id, email: 'admin@example.test' }); });
describe('field record administrator boundary', () => {
  it.each([401, 403])('rejects all administrator operations before reading data (%s)', async status => {
    mocks.requireAdmin.mockImplementation(async () => ({ ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status }) }));
    for (const operation of [() => GET(), () => POST(request({})), () => PUT(request({}), context), () => upload(request({})), () => previewMedia(request({}), context), () => deleteMedia(request({}), context), () => importSeed(request({ slug: seed.records[0].slug }))]) expect((await operation()).status).toBe(status);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejects cross-origin writes before database access', async () => {
    expect((await POST(request({}, 'https://other.example'))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('registers an approved draft when the browser Host differs from Next internal bind host', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id, slug: seed.records[0].slug }, error: null });
    const insert = vi.fn().mockReturnValue({ select: () => ({ single }) });
    mocks.from.mockReturnValue({ insert });
    const input = new Request('http://127.0.0.1:3000/api/admin/field-records/seed', {
      method: 'POST', headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: seed.records[0].slug }),
    });
    expect((await importSeed(input)).status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ slug: seed.records[0].slug, created_by: id }));
  });
  it('rejects publishing seed drafts without photo consent', async () => {
    const row = { id, slug: seed.records[0].slug, draft_content: seed.records[0].content, revision: 1 };
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });
    const response = await PUT(request({ revision: 1, action: 'publish' }), context);
    expect(response.status).toBe(400); expect(await response.text()).toContain('사진'); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejects stale saves before performing a mutation', async () => {
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { revision: 2 }, error: null }) }) }) });
    const response = await PUT(request({ revision: 1, action: 'unpublish' }), context);
    expect(response.status).toBe(409); expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
