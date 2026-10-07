import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('SPOKEDU MASTER activity completion lifecycle contract', () => {
  it('requires a scheduled Session to have started before completion can change', () => {
    const migration = read('supabase/migrations/20261007120000_require_started_session_for_activity_completion.sql');

    expect(migration).toContain("status = 'scheduled' and started_at is not null");
    expect(migration).toContain("status = 'completed'");
    expect(migration).toContain("errcode = '22023'");
  });
});
