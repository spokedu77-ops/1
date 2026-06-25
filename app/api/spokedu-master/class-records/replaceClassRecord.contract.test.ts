import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const route = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/class-records/route.ts'),
  'utf8',
);
const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260625191000_spokedu_master_replace_class_record.sql',
  ),
  'utf8',
);

describe('atomic class record PATCH contract', () => {
  const patch = route.slice(route.indexOf('export async function PATCH'));

  it('calls one replacement RPC and then reloads the existing DTO', () => {
    expect(patch.match(/\.rpc\(/g)).toHaveLength(1);
    expect(patch).toContain("'spokedu_master_replace_class_record'");
    expect(patch).toContain('.select(RECORD_SELECT)');
    expect(patch).toContain('toClassRecordDto');
  });

  it('does not directly update, delete, or insert record tables in PATCH', () => {
    expect(patch).not.toContain('.update(classRecordUpdatePayload');
    expect(patch).not.toContain(".from('spokedu_master_class_record_students')\n    .delete()");
    expect(patch).not.toContain(".from('spokedu_master_class_record_students')\n      .insert(");
  });

  it('passes owner only from access.userId rather than request JSON', () => {
    expect(patch).toContain('classRecordReplaceRpcPayload(input, access.userId, recordId)');
    expect(patch).not.toContain('input.owner');
  });

  it('maps expected RPC errors without exposing raw database messages', () => {
    expect(patch).toContain("replaceError.code === 'P0002'");
    expect(patch).toContain("replaceError.code === '22023'");
    expect(patch).toContain("{ error: 'Record update failed' }");
    expect(patch).not.toContain('{ error: replaceError.message }');
  });
});

describe('spokedu_master_replace_class_record SQL contract', () => {
  it('locks and verifies the owned live record before writing', () => {
    expect(migration).toContain('record.owner_id = p_owner_id');
    expect(migration).toContain('record.deleted_at is null');
    expect(migration).toContain('for update');
    expect(migration).toContain("errcode = 'P0002'");
  });

  it('validates real student IDs against the same live owner', () => {
    expect(migration).toContain('owned_student.owner_id = p_owner_id');
    expect(migration).toContain('owned_student.deleted_at is null');
    expect(migration).toContain("errcode = '22023'");
  });

  it('updates parent, replaces children, and supports an empty array atomically', () => {
    const update = migration.indexOf('update public.spokedu_master_class_records');
    const remove = migration.indexOf('delete from public.spokedu_master_class_record_students');
    const insert = migration.indexOf('insert into public.spokedu_master_class_record_students');
    expect(update).toBeGreaterThan(-1);
    expect(remove).toBeGreaterThan(update);
    expect(insert).toBeGreaterThan(remove);
    expect(migration).toContain('from jsonb_array_elements(p_students) student');
    expect(migration).toContain('return v_record_id');
  });

  it('limits execution to service_role', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });
});
