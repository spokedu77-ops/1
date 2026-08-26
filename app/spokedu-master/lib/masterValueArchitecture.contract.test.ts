import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('VALUE / Connected Memory continuity', () => {
  const activity = read('app/spokedu-master/activity/page.tsx');
  const memory = read('app/spokedu-master/activity/previousSessionMemory.ts');
  const nextMigration = read('supabase/migrations/20260823120000_spokedu_master_create_next_session.sql');
  const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');

  it('PREM-01: previous Session memo surfaces in next PREP without writing into current memo', () => {
    expect(memory).toContain('resolvePreviousSessionCarryover');
    expect(memory).toContain('Display-only carry-over');
    expect(activity).toContain('resolvePreviousSessionCarryover');
    expect(activity).toContain('지난 수업에서 이어갈 점');
    expect(activity).toContain('data-session-memory="previous-carryover"');
    expect(activity).not.toMatch(/setMemo\(previousCarryover/);
  });

  it('LIFECYCLE-01: next Session reuses Class + optional programs and starts with empty memo', () => {
    expect(nextMigration).toContain('v_source.class_id');
    expect(nextMigration).toContain('p_copy_programs');
    expect(nextMigration).toContain("'scheduled', null, null");
    expect(activity).toContain('이번 수업 활동 그대로 가져오기');
    expect(activity).toContain('buildNextSessionDraft');
  });

  it('VALUE-01: Home keeps Today operation above secondary reference links', () => {
    const todayIdx = dashboard.indexOf('<TodaySessionsPanel');
    const firstIdx = dashboard.indexOf('<FirstStartGuide');
    const opsIdx = dashboard.indexOf('data-dashboard-section="operations-flow"');
    expect(todayIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeGreaterThan(-1);
    expect(opsIdx).toBeGreaterThan(-1);
    expect(todayIdx).toBeLessThan(opsIdx);
    expect(firstIdx).toBeLessThan(opsIdx);
    expect(dashboard).toContain('수업 관리');
    expect(dashboard).toContain('안내문 보기');
    expect(dashboard).not.toContain('운영 이력');
  });
});
