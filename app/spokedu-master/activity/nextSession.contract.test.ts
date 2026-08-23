import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const activity = read('app/spokedu-master/activity/page.tsx');
const migration = read('supabase/migrations/20260823120000_spokedu_master_create_next_session.sql');
const api = read('app/api/spokedu-master/sessions/[sessionId]/next/route.ts');

describe('completed Session next action contract', () => {
  it('shows the action only for a completed Session', () => {
    expect(activity).toContain("status === 'completed'");
    expect(activity).toContain('다음 수업 만들기');
    expect(activity).not.toContain("status === 'scheduled' ? <button type=\"button\" disabled={saving} onClick={() => setNextSessionOpen");
  });

  it('creates one scheduled Session transactionally without history fields', () => {
    expect(migration).toContain("and status = 'completed'");
    expect(migration).toContain("'scheduled', null, null");
    expect(migration).toContain('p_copy_programs boolean');
    expect(migration).toContain('program_title_snapshot, sort_order, is_completed');
    expect(migration).toContain('program_title_snapshot, sort_order, false');
    expect(migration).not.toContain('spokedu_master_session_attendance');
    expect(migration).not.toContain('recurrence');
  });

  it('preserves exact Program/SPOMOVE identities and opens the returned id', () => {
    expect(migration).toContain('source_type, program_id, spomove_preset_id');
    expect(api).toContain("spokedu_master_create_next_session");
    expect(activity).toContain('session=${encodeURIComponent(nextSession.id)}');
    expect(activity).toContain('이번 수업 활동 그대로 가져오기');
  });
});
