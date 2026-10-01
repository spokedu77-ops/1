import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261001122358_harden_user_admin_columns.sql'),
  'utf8',
);
const bypassMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261001122738_tighten_admin_column_guard_bypass.sql'),
  'utf8',
);

describe('admin authorization column hardening migration', () => {
  it('guards every authorization column without a display-name fallback', () => {
    expect(migration).toContain('BEFORE UPDATE OF role, is_admin ON public.users');
    expect(migration).toContain('BEFORE UPDATE OF role ON public.profiles');
    expect(migration).toContain("RAISE EXCEPTION 'ADMIN_AUTHORIZATION_COLUMNS_IMMUTABLE'");
    expect(migration).not.toContain("u.name IN");
  });

  it('pins security-definer search paths and preserves privileged server writes', () => {
    expect(migration.match(/SECURITY DEFINER/g)).toHaveLength(2);
    expect(migration.match(/SET search_path = ''/g)).toHaveLength(2);
    expect(migration).toContain("(SELECT auth.role()) = 'service_role'");
    expect(bypassMigration).toContain("v_request_role = 'service_role'");
    expect(bypassMigration).toContain("v_request_role IS NULL AND session_user IN ('postgres', 'supabase_admin')");
  });
});
