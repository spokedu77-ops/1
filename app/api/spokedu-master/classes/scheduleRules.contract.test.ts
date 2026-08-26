import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const migration = readFileSync('supabase/migrations/20260829120000_spokedu_master_recurring_schedule_rules.sql', 'utf8');
const route = readFileSync('app/api/spokedu-master/classes/[classId]/schedule-rules/route.ts', 'utf8');
describe('recurring operations persistence', () => {
  it('keeps rule identity additive and Session history canonical', () => {
    expect(migration).toContain('spokedu_master_class_schedule_rules');
    expect(migration).toContain('schedule_rule_id uuid');
    expect(migration).toContain('on delete set null');
    expect(migration).not.toContain('delete from public.spokedu_master_sessions');
  });
  it('supports multiple class slots and atomic occurrence materialization', () => {
    expect(migration).toContain('spokedu_master_materialize_schedule_rule');
    expect(migration).toContain('for v_item in');
    expect(migration).not.toContain('unique (class_id');
    expect(migration).toContain("status <> 'cancelled'");
  });
  it('validates exact owner/Class and requires explicit POST', () => {
    expect(route).toContain("requireSpokeduMasterCapability('attendance')");
    expect(route).toContain(".eq('owner_id', access.userId)");
    expect(route).toContain("rpc('spokedu_master_materialize_schedule_rule'");
    expect(route).not.toContain('setInterval');
  });
});
