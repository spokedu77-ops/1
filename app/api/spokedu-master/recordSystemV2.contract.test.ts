import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classRecordCreateRpcPayload,
  normalizeClassRecordInput,
  normalizeStudentInput,
  studentUpdatePayload,
  toClassRecordDto,
  toStudentDto,
} from './operational-data';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260821120000_spokedu_master_record_system_v2_foundation.sql'),
  'utf8',
);
const reportPage = readFileSync(join(process.cwd(), 'app/spokedu-master/report/page.tsx'), 'utf8');

const lessonNote = () => normalizeClassRecordInput({
  legacyId: 'lesson-note-1',
  date: '2026-08-21',
  lessonTitle: 'X drill',
  classId: null,
  programId: 52,
  programTitle: 'X drill',
  recordType: 'lesson_note',
  memo: 'Private teacher reflection',
  applicationIdea: 'Lower the difficulty next time',
  parentNoteSnapshot: null,
  students: [],
});

describe('Record System V2 API contract', () => {
  it('accepts a lesson note with no students and roundtrips its private fields', () => {
    const input = lessonNote();
    expect(input.students).toEqual([]);
    expect(classRecordCreateRpcPayload(input, 'owner-1')).toMatchObject({
      p_record_type: 'lesson_note',
      p_application_idea: 'Lower the difficulty next time',
      p_students: [],
    });
    expect(toClassRecordDto({
      id: 'record-1', owner_id: 'owner-1', legacy_id: 'lesson-note-1',
      class_date: '2026-08-21', lesson_title: 'X drill', class_id: null,
      program_id: 52, program_title: 'X drill', record_type: 'lesson_note',
      memo: 'Private teacher reflection', application_idea: 'Lower the difficulty next time',
      parent_note_snapshot: null, created_at: '2026-08-21T00:00:00Z',
      updated_at: '2026-08-21T00:00:00Z', spokedu_master_class_record_students: [],
    })).toMatchObject({
      recordType: 'lesson_note', memo: 'Private teacher reflection',
      applicationIdea: 'Lower the difficulty next time', students: [],
    });
  });

  it.each([1, 2, 3] as const)('accepts observation score %s', (observationScore) => {
    const input = normalizeClassRecordInput({
      ...lessonNote(), recordType: 'detailed', students: [{
        studentId: null, studentLegacyId: null, studentName: 'Student',
        attendance: 'pending', focused: false, skills: [], memo: null, observationScore,
      }],
    });
    expect(input.students[0].observationScore).toBe(observationScore);
  });

  it.each([0, 4, -1, '2', Number.NaN])('rejects invalid observation score %s', (observationScore) => {
    expect(() => normalizeClassRecordInput({
      ...lessonNote(), recordType: 'detailed', students: [{
        studentId: null, studentLegacyId: null, studentName: 'Student',
        attendance: 'pending', focused: false, skills: [], memo: null, observationScore,
      }],
    })).toThrow(/observationScore is invalid/);
  });

  it('keeps legacy quick and detailed inputs valid without V2 fields', () => {
    for (const recordType of ['quick', 'detailed'] as const) {
      expect(normalizeClassRecordInput({
        legacyId: null, date: '2026-08-21', lessonTitle: null, classId: null,
        programId: null, programTitle: null, recordType, memo: null,
        parentNoteSnapshot: null, students: [],
      }).recordType).toBe(recordType);
    }
  });

  it('preserves guidanceNote on omitted PATCH and roundtrips explicit notes', () => {
    const omitted = normalizeStudentInput({ name: 'Student', group: null, meta: {} });
    expect(studentUpdatePayload(omitted)).not.toHaveProperty('guidance_note');
    const explicit = normalizeStudentInput({
      name: 'Student', group: null, meta: {}, guidanceNote: 'Internal only',
    });
    expect(studentUpdatePayload(explicit)).toHaveProperty('guidance_note', 'Internal only');
    expect(toStudentDto({
      id: 'student-1', owner_id: 'owner-1', legacy_id: null, name: 'Student',
      group_name: null, meta: {}, guidance_note: 'Internal only',
      created_at: '2026-08-21T00:00:00Z', updated_at: '2026-08-21T00:00:00Z',
    }).guidanceNote).toBe('Internal only');
  });
});

describe('Record System V2 migration and privacy contract', () => {
  it('adds only the approved nullable columns and constraints', () => {
    expect(migration).toContain("check (record_type in ('quick', 'detailed', 'lesson_note'))");
    expect(migration).toContain('add column if not exists application_idea text null');
    expect(migration).toContain('add column if not exists guidance_note text null');
    expect(migration).toContain('add column if not exists observation_score smallint null');
    expect(migration).toContain('observation_score between 1 and 3');
    expect(migration).not.toContain('create table public.spokedu_master_classes');
  });

  it('keeps legacy RPCs and adds owner-validating V2 RPCs', () => {
    expect(migration).toContain('spokedu_master_create_class_record_v2');
    expect(migration).toContain('spokedu_master_replace_class_record_v2');
    expect(migration).toContain('owned_student.owner_id = p_owner_id');
    expect(migration).toContain('to service_role');
  });

  it('builds reports from completed sessions without private guidance notes', () => {
    expect(reportPage).toContain("session.status === 'completed'");
    expect(reportPage).toContain('selected.memo');
    expect(reportPage).not.toContain('classRecords');
    expect(reportPage).not.toContain('guidanceNote');
  });
});
