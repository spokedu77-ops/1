import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const autoFinish = readFileSync(new URL('../../../api/sessions/auto-finish/route.ts', import.meta.url), 'utf8');
const feedback = readFileSync(new URL('../../../api/teacher/session-feedback/route.ts', import.meta.url), 'utf8');
const save = readFileSync(new URL('../../../api/admin/teachers-classes/save/route.ts', import.meta.url), 'utf8');
const bulk = readFileSync(
  new URL('../../../api/admin/teachers-classes/bulk-approve/route.ts', import.meta.url),
  'utf8',
);
const migration = readFileSync(
  new URL(
    '../../../../supabase/migrations/20260912140000_session_count_logs_follow_session_status.sql',
    import.meta.url,
  ),
  'utf8',
);
const finalMigration = readFileSync(
  new URL(
    '../../../../supabase/migrations/20261022210000_reconcile_completed_session_main_teacher_count.sql',
    import.meta.url,
  ),
  'utf8',
);

describe('session_count_logs follow sessions.status', () => {
  it('does not insert logs from status-change APIs (trigger is SSOT)', () => {
    expect(autoFinish).not.toContain("from('session_count_logs')");
    expect(feedback).not.toContain("from('session_count_logs')");
    expect(save).not.toContain("from('session_count_logs')");
    expect(bulk).not.toContain("from('session_count_logs')");
  });

  it('clears logs when a session leaves finished/verified or is deleted', () => {
    expect(migration).toContain('clear_session_count_logs_for_session');
    expect(finalMigration).toContain("NEW.status IN ('finished', 'verified')");
    expect(finalMigration).toContain('BEFORE DELETE ON public.sessions');
    expect(finalMigration).not.toContain('AFTER DELETE ON public.sessions');
    expect(finalMigration).toContain("AND reason = '트리거: sessions.status sync'");
  });

  it('fails completion atomically when automatic count synchronization is incomplete', () => {
    expect(finalMigration).not.toContain('EXCEPTION WHEN others THEN\n    NULL');
    expect(finalMigration).toContain("MESSAGE = 'SESSION_COUNT_MAIN_TEACHER_REQUIRED'");
    expect(finalMigration).toContain("MESSAGE = 'SESSION_COUNT_TEACHER_NOT_FOUND'");
    expect(finalMigration).toContain("MESSAGE = 'SESSION_COUNT_EXISTING_LOG_CONFLICT'");
    expect(finalMigration).toContain("MESSAGE = 'SESSION_COUNT_SYNC_INCOMPLETE'");
    expect(finalMigration).toContain('ON CONFLICT (session_id, teacher_id)');
  });

  it('preserves manual rows and reuses the single delete trigger name', () => {
    expect(finalMigration.match(/CREATE TRIGGER trg_session_count_logs_sync_delete/g)).toHaveLength(1);
    expect(finalMigration).toContain('DROP TRIGGER IF EXISTS trg_session_count_logs_sync_delete');
    expect(finalMigration).toContain(
      "WHERE session_id = p_session_id\n    AND reason = '트리거: sessions.status sync'",
    );
  });
});
