import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('./20261018123903_harden_external_access_control.sql', import.meta.url),
  'utf8',
);

describe('external access-control migration', () => {
  it('removes anonymous and cross-user profile reads', () => {
    expect(migration).toContain('drop policy if exists users_select_all');
    expect(migration).toContain('drop policy if exists users_select_anon_verified_creator');
    expect(migration).toContain('create policy users_select_admin_or_self');
    expect(migration).toContain('revoke all on table public.users from anon');
  });

  it('protects sensitive user and session settlement fields', () => {
    expect(migration).toContain('USER_SENSITIVE_FIELDS_ADMIN_ONLY');
    expect(migration).toContain('new.documents is distinct from old.documents');
    expect(migration).toContain('new.fee_private is distinct from old.fee_private');
    expect(migration).toContain('SESSION_SETTLEMENT_FIELDS_SERVER_ONLY');
    expect(migration).toContain('before update of mileage_option on public.sessions');
  });

  it('removes name-based administration and direct public ingestion', () => {
    expect(migration).not.toMatch(/최지훈|김윤기|김구민/);
    expect(migration).toContain('drop policy if exists dispatch_leads_public_insert');
    expect(migration).toContain('drop policy if exists move_report_events_insert_anon');
    expect(migration).toContain('drop policy if exists "Enable upload for all"');
  });
});
