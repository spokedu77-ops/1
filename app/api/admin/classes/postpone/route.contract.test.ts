import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(join(process.cwd(), 'app/api/admin/classes/postpone/route.ts'), 'utf8');
const panelSource = readFileSync(
  join(process.cwd(), 'app/admin/classes/components/ClassBundlePanel.tsx'),
  'utf8',
);
const migrationSource = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261022190000_atomic_class_postpone.sql'),
  'utf8',
);

describe('atomic class postpone contract', () => {
  it('keeps the mutation behind admin auth and one service-role RPC', () => {
    expect(routeSource).toContain('requireAdmin()');
    expect(routeSource).toContain('getServiceSupabase().rpc');
    expect(routeSource).toContain("'admin_apply_class_postpone'");
    expect(routeSource).not.toContain(".from('sessions')");
  });

  it('sends the concurrency and idempotency guards from the UI', () => {
    expect(panelSource).toContain('expectedStartAt: row.start_at');
    expect(panelSource).toContain('requestKey: crypto.randomUUID()');
    expect(panelSource).toContain('for (let attempt = 0; attempt < 2; attempt += 1)');
    expect(panelSource).not.toContain('postponeCascade(supabase');
    expect(panelSource).not.toContain('undoPostponeCascade(supabase');
  });

  it('uses existing storage, preserves server-only execution, and delegates settlement', () => {
    expect(migrationSource).not.toMatch(/create\s+table/i);
    expect(migrationSource).toContain('private.phase2_mileage_request_results');
    expect(migrationSource).toContain('public.admin_apply_session_linked_mileage');
    expect(migrationSource).toContain("operation <> 'class-postpone'");
    expect(migrationSource).toContain('for update');
    expect(migrationSource).toContain('POSTPONE_LEGACY_MILEAGE_REVIEW_REQUIRED');
    expect(migrationSource).toContain(
      'revoke all on function public.admin_apply_class_postpone(uuid, text, timestamptz, uuid) from public, anon, authenticated',
    );
    expect(migrationSource).toContain(
      'grant execute on function public.admin_apply_class_postpone(uuid, text, timestamptz, uuid) to service_role',
    );
  });
});
