import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20261006130000_harden_service_only_rls_policies.sql', 'utf8');

describe('service-only table RLS hardening', () => {
  it.each([
    'commercial_funnel_events',
    'mr_special_pe_asset_map',
    'spokedu_master_billing_runs',
    'spokedu_master_class_schedule_rules',
    'spokedu_master_entitlement_grants',
    'spokedu_master_promotion_invites',
  ])('keeps %s behind service-role access', (table) => {
    expect(migration).toContain(`'${table}'`);
  });

  it('revokes direct public access and creates an explicit service-role policy', () => {
    expect(migration).toContain("revoke all on table public.%I from public, anon, authenticated");
    expect(migration).toContain("for all to service_role using (true) with check (true)");
  });
});
