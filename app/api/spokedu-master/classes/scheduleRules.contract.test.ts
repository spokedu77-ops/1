import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const migration = readFileSync('supabase/migrations/20260829120000_spokedu_master_recurring_schedule_rules.sql', 'utf8');
const rlsMigration = readFileSync('supabase/migrations/20261002122223_harden_spokedu_master_schedule_rules_rls.sql', 'utf8');
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
    expect(route).toContain("rpc('spokedu_master_materialize_schedule_rule_with_activities'");
    expect(route).toContain('p_activities: canonicalActivities');
    expect(route).not.toContain('setInterval');
  });
  it('keeps schedule rules server-only while enabling RLS', () => {
    expect(rlsMigration).toContain('enable row level security');
    expect(rlsMigration).toContain('revoke all on table public.spokedu_master_class_schedule_rules from public, anon, authenticated');
    expect(rlsMigration).toContain('grant all on table public.spokedu_master_class_schedule_rules to service_role');
    expect(rlsMigration).toContain('set search_path = pg_catalog, public');
    expect(rlsMigration).toContain('from public, anon, authenticated');
    expect(rlsMigration).not.toContain('create policy');
    expect(rlsMigration).not.toContain('to authenticated');
  });
});
