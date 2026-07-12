import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classRecordInsertPayload,
  classRecordStudentInsertPayload,
  normalizeClassRecordInput,
  normalizeStudentInput,
  studentInsertPayload,
  studentUpdatePayload,
  toClassRecordDto,
  toStudentDto,
  type MasterClassRecordRow,
} from './operational-data';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('SPOKEDU MASTER operational data contract', () => {
  it('rejects fabricated student metric fields', () => {
    expect(() =>
      normalizeStudentInput({
        legacyId: 'local-1',
        name: '학생',
        attendance: 87,
      }),
    ).toThrow(/Unsupported student field: attendance/);
  });

  it('uses the authenticated owner for student inserts', () => {
    const input = normalizeStudentInput({
      legacyId: '1700000000000',
      name: '학생 A',
      group: 'A반',
      meta: { note: '8세' },
      ownerId: 'attacker',
    });

    expect(studentInsertPayload(input, 'auth-user')).toEqual({
      owner_id: 'auth-user',
      legacy_id: '1700000000000',
      name: '학생 A',
      group_name: 'A반',
      meta: { note: '8세' },
    });
  });

  it('updates mutable student fields without owner or legacy identifiers', () => {
    const input = normalizeStudentInput({
      name: '학생 B',
      group: 'B반',
      meta: '9세',
    });

    expect(studentUpdatePayload(input)).toEqual({
      name: '학생 B',
      group_name: 'B반',
      meta: '9세',
    });
    expect(studentUpdatePayload(input)).not.toHaveProperty('owner_id');
    expect(studentUpdatePayload(input)).not.toHaveProperty('legacy_id');
  });

  it('keeps string student meta through normalize, insert payload, and DTO mapping', () => {
    const input = normalizeStudentInput({
      legacyId: 'local-1',
      name: '학생',
      group: 'A',
      meta: '만 8세 / 수강 6개월',
    });

    expect(input.meta).toBe('만 8세 / 수강 6개월');
    expect(studentInsertPayload(input, 'owner-1').meta).toBe('만 8세 / 수강 6개월');
    expect(
      normalizeStudentInput({
        legacyId: 'local-2',
        name: '학생 2',
        meta: { source: 'legacy' },
      }).meta,
    ).toEqual({ source: 'legacy' });
    expect(
      toStudentDto({
        id: 'student-1',
        owner_id: 'owner-1',
        legacy_id: 'local-1',
        name: '학생',
        group_name: 'A',
        meta: '만 8세 / 수강 6개월',
        created_at: '2026-06-16T00:00:00.000Z',
        updated_at: '2026-06-16T00:00:00.000Z',
      }).meta,
    ).toBe('만 8세 / 수강 6개월');
  });

  it('normalizes class record input without trusting request owner fields', () => {
    const input = normalizeClassRecordInput({
      ownerId: 'attacker',
      legacyId: 'record-1',
      date: '2026-06-16T01:02:03.000Z',
      lessonTitle: '균형 수업',
      classId: 'A반',
      programId: 52,
      programTitle: '밴드 씨름',
      recordType: 'detailed',
      memo: '메모',
      students: [
        {
          studentId: '11111111-1111-1111-1111-111111111111',
          studentLegacyId: 'student-1',
          studentName: '학생 A',
          attendance: 'present',
          focused: true,
          skills: ['균형', '균형', '', 3],
          memo: '좋음',
        },
      ],
    });

    expect(classRecordInsertPayload(input, 'auth-user')).toMatchObject({
      owner_id: 'auth-user',
      legacy_id: 'record-1',
      class_date: '2026-06-16',
      record_type: 'detailed',
      program_id: 52,
    });
    expect(input.students[0].skills).toEqual(['균형']);
  });

  it('keeps only teacher-entered skill tags on child rows', () => {
    const row = classRecordStudentInsertPayload(
      {
        studentId: null,
        studentLegacyId: 'student-1',
        studentName: '학생 A',
        attendance: 'absent',
        focused: false,
        skills: ['방향 전환'],
        memo: null,
      },
      'auth-user',
      'record-id',
      null,
    );

    expect(row).toEqual({
      owner_id: 'auth-user',
      record_id: 'record-id',
      student_id: null,
      student_legacy_id: 'student-1',
      student_name_snapshot: '학생 A',
      attendance: 'absent',
      focused: false,
      skills: ['방향 전환'],
      memo: null,
    });
  });

  it('calculates record summary values from child rows', () => {
    const dto = toClassRecordDto({
      id: 'record-id',
      owner_id: 'auth-user',
      legacy_id: 'legacy-record',
      class_date: '2026-06-16',
      lesson_title: '수업',
      class_id: 'A반',
      program_id: 52,
      program_title: '밴드 씨름',
      record_type: 'detailed',
      memo: null,
      parent_note_snapshot: null,
      created_at: '2026-06-16T00:00:00.000Z',
      updated_at: '2026-06-16T00:00:00.000Z',
      spokedu_master_class_record_students: [
        {
          id: 'child-1',
          owner_id: 'auth-user',
          record_id: 'record-id',
          student_id: null,
          student_legacy_id: 'student-1',
          student_name_snapshot: '학생 A',
          attendance: 'present',
          focused: true,
          skills: ['균형', '협응'],
          memo: null,
          created_at: '2026-06-16T00:00:00.000Z',
          updated_at: '2026-06-16T00:00:00.000Z',
        },
        {
          id: 'child-2',
          owner_id: 'auth-user',
          record_id: 'record-id',
          student_id: null,
          student_legacy_id: 'student-2',
          student_name_snapshot: '학생 B',
          attendance: 'absent',
          focused: false,
          skills: [],
          memo: null,
          created_at: '2026-06-16T00:00:00.000Z',
          updated_at: '2026-06-16T00:00:00.000Z',
        },
      ],
    } satisfies MasterClassRecordRow);

    expect(dto.present).toBe(1);
    expect(dto.absent).toBe(1);
    expect(dto.focusCount).toBe(1);
    expect(dto.skillCount).toBe(2);
  });

  it('defines three isolated tables with owner RLS and partial legacy uniqueness', () => {
    const migration = read('supabase/migrations/20260616120000_spokedu_master_operational_data.sql');

    expect(migration).toContain('create table public.spokedu_master_students');
    expect(migration).toContain('create table public.spokedu_master_class_records');
    expect(migration).toContain('create table public.spokedu_master_class_record_students');
    expect(migration).toContain('where legacy_id is not null');
    expect(migration).toContain('where student_legacy_id is not null');
    expect(migration).toContain('owner_id = (select auth.uid())');
    expect(migration).toContain('set search_path = pg_catalog');
    expect(migration).toContain("check (record_type in ('quick', 'detailed'))");
    expect(migration).toContain("check (attendance in ('pending', 'present', 'absent'))");
    expect(migration).not.toContain('spokedu_pro_students');
  });

  it('keeps active Zustand operational state separated from server APIs and legacy archive', () => {
    const store = read('app/spokedu-master/store/index.ts');

    expect(store).not.toContain('students: state.students');
    expect(store).not.toContain('classRecords: state.classRecords');
    expect(store).toContain('createLegacyOperationalArchiveFromPersistedStore');
    expect(store).toContain("name: 'spokedu-master-store'");
    expect(store).not.toContain('/api/spokedu-master/students');
    expect(store).not.toContain('/api/spokedu-master/class-records');
  });
});
