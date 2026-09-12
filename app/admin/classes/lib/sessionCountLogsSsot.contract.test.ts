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

describe('session_count_logs follow sessions.status', () => {
  it('does not insert logs from status-change APIs (trigger is SSOT)', () => {
    expect(autoFinish).not.toContain("from('session_count_logs')");
    expect(feedback).not.toContain("from('session_count_logs')");
    expect(save).not.toContain("from('session_count_logs')");
    expect(bulk).not.toContain("from('session_count_logs')");
  });

  it('clears logs when a session leaves finished/verified or is deleted', () => {
    expect(migration).toContain('clear_session_count_logs_for_session');
    expect(migration).toContain("AFTER DELETE ON public.sessions");
    expect(migration).toContain("NEW.status IN ('finished', 'verified')");
    expect(migration).toContain('DELETE FROM public.session_count_logs');
  });
});
