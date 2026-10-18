import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../supabase/migrations/20261018123903_harden_external_access_control.sql', import.meta.url),
  'utf8',
);

describe('external access-control migration', () => {
  it('removes anonymous and cross-user profile reads', () => {
    expect(migration).toContain('drop policy if exists users_select_all');
    expect(migration).toContain('drop policy if exists users_select_anon_verified_creator');
    expect(migration).toContain('create policy users_select_admin_or_self');
    expect(migration).toContain('revoke all on table public.users from anon');
  });

  it('protects the session settlement field', () => {
    expect(migration).toContain('SESSION_SETTLEMENT_FIELDS_SERVER_ONLY');
    expect(migration).toContain('before update of mileage_option on public.sessions');
  });

  it('removes public writes from the three P0 Storage buckets', () => {
    expect(migration).toContain('Allow All for Session Files 1egybuo_1');
    expect(migration).toContain('drop policy if exists "Enable upload for all"');
    expect(migration).toContain('Allow All for instructors 4zivli_1');
    expect(migration).toContain('create policy instructors_admin_insert');
  });
});
