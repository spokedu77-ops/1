import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20261011150000_require_started_session_completion.sql');
const route = read('app/api/spokedu-master/sessions/route.ts');

describe('Session completion deployment contract', () => {
  it('rejects PREP completion in both the database and application boundary', () => {
    expect(migration).toContain('if v_session.started_at is null then');
    expect(migration).toContain("message = 'session must be started before completion'");
    expect(route).toContain("if (session.status !== 'completed' && !session.started_at)");
    expect(route).toContain("{ error: 'Only started sessions can be completed' }, { status: 409 }");
  });

  it('preserves the deployed function contract and service-only execution', () => {
    expect(migration).toContain('spokedu_master_complete_session(');
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = pg_catalog, public');
    expect(migration).toContain('returns uuid');
    expect(migration).toContain('historical session fields are locked');
    expect(migration).toContain('spokedu_master_assert_complete_attendance');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });
});
