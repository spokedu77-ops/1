import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20261006120000_spokedu_master_undo_session_start.sql');

describe('SPOKEDU MASTER Session start undo', () => {
  it('locks the owned Session and rejects durable run evidence before returning to PREP', () => {
    expect(migration).toContain('owner_id = p_owner_id');
    expect(migration).toContain('for update');
    expect(migration).toContain('program.is_completed = true');
    expect(migration).toContain('record.deleted_at is null');
    expect(migration.indexOf('program.is_completed = true')).toBeLessThan(migration.indexOf('set started_at = null'));
    expect(migration.indexOf('record.deleted_at is null')).toBeLessThan(migration.indexOf('set started_at = null'));
  });

  it('clears only lifecycle markers and preserves preparation data', () => {
    const update = migration.slice(migration.indexOf('update public.spokedu_master_sessions'));
    expect(update).toContain('started_at = null');
    expect(update).toContain('roster_locked_at = null');
    expect(update).not.toMatch(/delete\s+from/i);
    expect(update).not.toMatch(/memo\s*=/i);
  });

  it('wires the guarded command to the RUN footer', () => {
    const route = read('app/api/spokedu-master/sessions/[sessionId]/start/route.ts');
    const provider = read('app/spokedu-master/operational/OperationalDataProvider.tsx');
    const detail = read('app/spokedu-master/manage/session-detail/SessionDetailSheet.tsx');
    const actions = read('app/spokedu-master/manage/session-detail/SessionActions.tsx');
    expect(route).toContain("supabase.rpc('spokedu_master_undo_session_start'");
    expect(provider).toContain("method: 'DELETE'");
    expect(detail).toContain('data.undoSessionStart(draft.activeSession.id)');
    expect(actions).toContain('시작 취소');
    expect(actions).toContain('!activeSession?.programs.some((program) => program.isCompleted)');
  });
});
