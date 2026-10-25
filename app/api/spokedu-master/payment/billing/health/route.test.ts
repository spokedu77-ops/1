import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  requireAdmin: vi.fn(),
  providerConfigured: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: mocks.getServiceSupabase,
  requireAdmin: mocks.requireAdmin,
}));
vi.mock('@/app/lib/server/spokeduMasterBillingProvider', () => ({
  isSpokeduMasterBillingProviderConfigured: mocks.providerConfigured,
}));

import { POST } from './route';

describe('billing provider health recheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ ok: true, userId: 'admin', email: 'admin@example.test' });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.getServiceSupabase.mockReturnValue({
      from: vi.fn(() => ({ upsert: mocks.upsert })),
    });
  });

  it('rejects non-admin rechecks without reading provider configuration', async () => {
    mocks.requireAdmin.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    });
    const response = await POST();
    expect(response.status).toBe(403);
    expect(mocks.providerConfigured).not.toHaveBeenCalled();
  });

  it('keeps the circuit blocked when Production provider configuration is invalid', async () => {
    mocks.providerConfigured.mockReturnValue(false);
    const response = await POST();
    expect(response.status).toBe(503);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'misconfigured' }));
  });

  it('clears the circuit after a valid redeployed configuration without charging Toss', async () => {
    mocks.providerConfigured.mockReturnValue(true);
    const response = await POST();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, requiresAdminAction: false });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'configured' }));
  });
});
