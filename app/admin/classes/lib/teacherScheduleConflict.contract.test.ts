import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../../supabase/migrations/20261026171825_stage2c_teacher_schedule_conflict_guard.sql', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');
const route = readFileSync(
  new URL('../../../api/admin/classes/sessions/bulk-update/route.ts', import.meta.url),
  'utf8',
);
const panel = readFileSync(new URL('../components/ClassBundlePanel.tsx', import.meta.url), 'utf8');
const createPage = readFileSync(new URL('../list/page.tsx', import.meta.url), 'utf8');
const roundExtend = readFileSync(new URL('../../classes-shared/lib/roundExtendUtils.ts', import.meta.url), 'utf8');
const postponeRoute = readFileSync(new URL('../../../api/admin/classes/postpone/route.ts', import.meta.url), 'utf8');

describe('Stage 2C teacher schedule conflict guard', () => {
  it('checks every main and assistant assignment with half-open overlap semantics', () => {
    expect(migration).toContain('session_count_teacher_ids(NEW.created_by, NEW.memo)');
    expect(migration).toContain('existing.start_at < NEW.end_at');
    expect(migration).toContain('existing.end_at > NEW.start_at');
    expect(migration).toContain("NOT IN ('cancelled', 'postponed', 'deleted')");
    expect(migration).toContain("tstzrange(NEW.start_at, NEW.end_at, '[)')");
  });

  it('does not backfill historical sessions and preserves status-only restore paths', () => {
    expect(migration).not.toMatch(/INSERT INTO private\.session_teacher_schedule_slots[^;]*FROM public\.sessions/);
    expect(migration).toContain('Status-only changes preserve legacy cancel/restore behavior');
  });

  it('uses a server-only atomic batch RPC for bulk changes', () => {
    expect(migration).toContain('admin_apply_session_schedule_changes(p_changes jsonb)');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.admin_apply_session_schedule_changes(jsonb) TO service_role');
    expect(route).toContain("requireAdmin()");
    expect(route).toContain("supabase.rpc('admin_apply_session_schedule_changes'");
    expect(panel).toContain('applyBulkSessionChanges(changes)');
  });

  it('covers legacy and current creation, extension, single, bulk, and postpone write paths', () => {
    expect(migration).toContain('AFTER INSERT OR UPDATE OF start_at, end_at, created_by, memo, status OR DELETE');
    expect(createPage).toContain("supabase.from('sessions').insert(sessionsToInsert)");
    expect(roundExtend).toContain(".from('sessions')");
    expect(roundExtend).toContain('.insert(newSessions)');
    expect(panel).toContain('supabase.from("sessions").update(patch).eq("id", sessionId)');
    expect(postponeRoute).toContain("rpc('admin_apply_class_postpone'");
    expect(migration).toContain('Status-only changes preserve legacy cancel/restore behavior');
  });
});
