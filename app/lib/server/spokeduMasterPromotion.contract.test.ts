import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261001085154_spokedu_master_promotional_entitlements.sql'), 'utf8');

describe('promotional entitlement persistence contract', () => {
  it('keeps promotion separate from billing and private to server authority', () => {
    expect(migration).toContain('CREATE TABLE public.spokedu_master_entitlement_grants');
    expect(migration).toContain('CREATE TABLE public.spokedu_master_promotion_invites');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE public.spokedu_master_entitlement_grants FROM anon, authenticated');
    expect(migration).not.toContain('spokedu_master_subscriptions');
    expect(migration).not.toContain('billing_key');
    expect(migration).not.toContain('payment_order');
  });

  it('activates for the configured duration and atomically marks one invite redeemed', () => {
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('make_interval(days => v_invite.duration_days)');
    expect(migration).toContain('redeemed_by = p_user_id');
    expect(migration).toContain('email_confirmed_at IS NOT NULL');
  });
});
