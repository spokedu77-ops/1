import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classRecordCreateRpcPayload, normalizeClassRecordInput } from '../operational-data';

const route = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/class-records/route.ts'),
  'utf8',
);
const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260628121000_spokedu_master_create_class_record.sql',
  ),
  'utf8',
);

describe('atomic class record POST contract', () => {
  const post = route.slice(
    route.indexOf('export async function POST'),
    route.indexOf('export async function PATCH'),
  );

  it('creates by one RPC transaction and reloads by authenticated owner plus returned id', () => {
    expect(post.match(/\.rpc\(/g)).toHaveLength(1);
    expect(post).toContain("'spokedu_master_create_class_record'");
    expect(post).toContain('classRecordCreateRpcPayload(input, access.userId)');
    expect(post).toContain(".eq('owner_id', access.userId)");
    expect(post).toContain(".eq('id', createdRecord.record_id)");
    expect(post).toContain('toClassRecordDto');
  });

  it('does not directly insert parent or child rows and does not compensate with route deletes', () => {
    expect(post).not.toContain('.insert(classRecordInsertPayload');
    expect(post).not.toContain('.insert(childRows');
    expect(post).not.toContain("from('spokedu_master_class_record_students')");
    expect(post).not.toContain('.delete()');
    expect(post).not.toContain('rolledBack');
    expect(post).not.toContain('partialSave');
  });

  it('maps expected RPC validation errors without exposing database messages', () => {
    expect(route).toContain("code === '22023'");
    expect(route).toContain("code === '22P02'");
    expect(route).toContain("code === '23514'");
    expect(post).toContain('isExpectedClassRecordInputError(createError?.code)');
    expect(post).not.toContain('{ error: createError.message }');
  });
});

describe('classRecordCreateRpcPayload', () => {
  it('passes only normalized input and authenticated owner to the create RPC', () => {
    const input = normalizeClassRecordInput({
      ownerId: 'attacker',
      legacyId: 'request-key-1',
      date: '2026-06-16',
      lessonTitle: 'Lesson',
      classId: 'Class A',
      programId: 52,
      programTitle: 'Program',
      recordType: 'detailed',
      memo: 'Common memo',
      parentNoteSnapshot: 'Parent note',
      students: [
        {
          studentId: '11111111-1111-4111-8111-111111111111',
          studentLegacyId: 'student-1',
          studentName: 'Student A',
          attendance: 'present',
          focused: true,
          skills: ['balance'],
          memo: 'Student memo',
        },
      ],
    });

    expect(classRecordCreateRpcPayload(input, 'auth-owner')).toEqual({
      p_owner_id: 'auth-owner',
      p_legacy_id: 'request-key-1',
      p_class_date: '2026-06-16',
      p_lesson_title: 'Lesson',
      p_class_id: 'Class A',
      p_program_id: 52,
      p_program_title: 'Program',
      p_record_type: 'detailed',
      p_memo: 'Common memo',
      p_parent_note_snapshot: 'Parent note',
      p_students: [
        {
          student_id: '11111111-1111-4111-8111-111111111111',
          student_legacy_id: 'student-1',
          student_name_snapshot: 'Student A',
          attendance: 'present',
          focused: true,
          skills: ['balance'],
          memo: 'Student memo',
        },
      ],
    });
  });
});

describe('spokedu_master_create_class_record SQL contract', () => {
  it('uses existing legacy_id as an owner-scoped idempotency key', () => {
    expect(migration).toContain('p_legacy_id text');
    expect(migration).toContain('owner_id = p_owner_id');
    expect(migration).toContain('legacy_id = p_legacy_id');
    expect(migration).toContain('for update');
    expect(migration).toContain('on conflict (owner_id, legacy_id) where legacy_id is not null do nothing');
    expect(migration).toContain('created := false');
    expect(migration).toContain('created := true');
  });

  it('validates student IDs against live students for the same owner before insert', () => {
    expect(migration).toContain('owned_student.owner_id = p_owner_id');
    expect(migration).toContain('owned_student.deleted_at is null');
    expect(migration).toContain("errcode = '22023'");
    expect(migration).toContain('jsonb_array_elements(p_students)');
  });

  it('inserts parent before children inside one function so child failure rolls back the parent', () => {
    const parentInsert = migration.indexOf('insert into public.spokedu_master_class_records');
    const childInsert = migration.indexOf('insert into public.spokedu_master_class_record_students');
    expect(parentInsert).toBeGreaterThan(-1);
    expect(childInsert).toBeGreaterThan(parentInsert);
    expect(migration).not.toContain('delete from public.spokedu_master_class_records');
  });

  it('limits execution to service_role', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });
});
