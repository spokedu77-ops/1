import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260625190000_spokedu_master_trial_entitlement.sql',
  ),
  'utf8',
);

describe('SPOKEDU MASTER trial entitlement migration', () => {
  it('adds only server-owned trial timestamps and permits trial status', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS trial_started_at timestamptz');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz');
    expect(sql).toContain("'trial'");
    expect(sql).not.toContain('auth.users');
  });
});
