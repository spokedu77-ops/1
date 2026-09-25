import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260925120000_spokedu_master_delete_operational_sessions.sql'),
  'utf8',
);

const DELETE_ORDER = [
  'spokedu_master_class_record_students',
  'spokedu_master_class_records',
  'spokedu_master_explanations',
  'spokedu_master_program_favorites',
  'spokedu_master_session_attendance',
  'spokedu_master_session_programs',
  'spokedu_master_sessions',
  'spokedu_master_class_students',
  'spokedu_master_class_schedule_rules',
  'spokedu_master_students',
  'spokedu_master_classes',
];

describe('operational delete RPC covers the session graph', () => {
  it('deletes owner operational tables in FK-safe order and leaves account data', () => {
    let previous = -1;
    for (const table of DELETE_ORDER) {
      const index = migration.indexOf(`delete from public.${table}`);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }
    expect(migration).toContain('where owner_id = p_owner_id');
    expect(migration).not.toContain('deleted_at is null');
    for (const preserved of [
      'auth.users',
      'spokedu_master_profiles',
      'spokedu_master_subscriptions',
      'spokedu_master_payment_orders',
      'spokedu_master_payment_webhook_events',
      'spokedu_master_billing_runs',
      'spokedu_master_program_meta',
      'spokedu_master_spomove_presets',
      'spokedu_master_drill_meta',
    ]) {
      expect(migration).not.toContain(preserved);
    }
  });

  it('keeps the same signature and service-role-only execute grant', () => {
    expect(migration).toContain('function public.spokedu_master_delete_operational_data');
    expect(migration).toContain('p_owner_id uuid');
    expect(migration).toContain('security definer');
    expect(migration).toContain('revoke all on function public.spokedu_master_delete_operational_data(uuid)');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.spokedu_master_delete_operational_data(uuid)');
    expect(migration).toContain('to service_role');
    expect(migration).not.toContain('to anon');
    expect(migration).not.toContain('to authenticated');
  });

  it('returns per-table counts', () => {
    for (const key of [
      'classRecordStudents',
      'classRecords',
      'explanations',
      'programFavorites',
      'sessionAttendance',
      'sessionPrograms',
      'sessions',
      'classStudents',
      'scheduleRules',
      'students',
      'classes',
      'total',
    ]) {
      expect(migration).toContain(`'${key}'`);
    }
  });
});
