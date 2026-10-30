import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/server/adminAuth', () => ({
  requireAdmin: vi.fn(),
  getServiceSupabase: vi.fn(),
}));

vi.mock('@/app/lib/equipment/writeMode', () => ({
  isLedgerWriteMode: vi.fn(() => true),
}));

import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { POST } from './route';

describe('POST /api/admin/equipment/rent', () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      userId: '11111111-1111-4111-8111-111111111111',
      email: 'admin@test.com',
    } as Awaited<ReturnType<typeof requireAdmin>>);
  });

  it('returns 401 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as Awaited<ReturnType<typeof requireAdmin>>);
    const res = await POST(
      new Request('http://localhost/api/admin/equipment/rent', {
        method: 'POST',
        body: JSON.stringify({ catalog_id: 1, teacher_id: '11111111-1111-4111-8111-111111111111', qty: 1 }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('calls rpc on valid body', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { qty_available: 1 }, error: null });
    vi.mocked(getServiceSupabase).mockReturnValue({ rpc } as unknown as ReturnType<typeof getServiceSupabase>);
    const res = await POST(
      new Request('http://localhost/api/admin/equipment/rent', {
        method: 'POST',
        body: JSON.stringify({
          catalog_id: 1,
          teacher_id: '11111111-1111-4111-8111-111111111111',
          qty: 2,
          request_key: '1234567890123456',
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      'admin_equipment_rent',
      expect.objectContaining({ p_qty: 2 }),
    );
  });
});
