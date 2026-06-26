import type {
  ExistingAttendanceStatus,
  ExistingRecordType,
  MasterClassRecordDto,
  MasterStudentDto,
  MasterStudentMeta,
} from '@/app/spokedu-master/types/operational';

export type MasterStudentRow = {
  id: string;
  owner_id: string;
  legacy_id: string | null;
  name: string;
  group_name: string | null;
  meta: MasterStudentMeta;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type MasterClassRecordStudentRow = {
  id: string;
  owner_id: string;
  record_id: string;
  student_id: string | null;
  student_legacy_id: string | null;
  student_name_snapshot: string;
  attendance: ExistingAttendanceStatus;
  focused: boolean;
  skills: string[];
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type MasterClassRecordRow = {
  id: string;
  owner_id: string;
  legacy_id: string | null;
  class_date: string;
  lesson_title: string | null;
  class_id: string | null;
  program_id: number | null;
  program_title: string | null;
  record_type: ExistingRecordType;
  memo: string | null;
  parent_note_snapshot: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  spokedu_master_class_record_students?: MasterClassRecordStudentRow[];
};

export type NormalizedStudentInput = {
  legacyId: string | null;
  name: string;
  group: string | null;
  meta: MasterStudentMeta;
};

export type NormalizedClassRecordStudentInput = {
  studentId: string | null;
  studentLegacyId: string | null;
  studentName: string;
  attendance: ExistingAttendanceStatus;
  focused: boolean;
  skills: string[];
  memo: string | null;
};

export type NormalizedClassRecordInput = {
  legacyId: string | null;
  date: string;
  lessonTitle: string | null;
  classId: string | null;
  programId: number | null;
  programTitle: string | null;
  recordType: ExistingRecordType;
  memo: string | null;
  parentNoteSnapshot: string | null;
  students: NormalizedClassRecordStudentInput[];
};

const FORBIDDEN_STUDENT_FIELDS = new Set([
  'level',
  'attendance',
  'classes',
  'streak',
  'risk',
  'skills',
  'badges',
  'history',
]);

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeMeta(value: unknown): MasterStudentMeta {
  if (value == null) return {};
  if (typeof value === 'string') return value;
  if (!isPlainObject(value)) throw new Error('meta must be a string or plain object');
  return { ...value };
}

function assertNoForbiddenStudentFields(value: Record<string, unknown>) {
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_STUDENT_FIELDS.has(key)) {
      throw new Error(`Unsupported student field: ${key}`);
    }
  }
}

export function normalizeStudentInput(body: unknown): NormalizedStudentInput {
  if (!isPlainObject(body)) throw new Error('Invalid student payload');
  assertNoForbiddenStudentFields(body);

  const name = textOrNull(body.name);
  if (!name) throw new Error('name is required');

  return {
    legacyId: textOrNull(body.legacyId),
    name,
    group: textOrNull(body.group),
    meta: normalizeMeta(body.meta),
  };
}

function normalizeDate(value: unknown) {
  const raw = textOrNull(value);
  if (!raw) throw new Error('date is required');
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error('date is invalid');
  return parsed.toISOString().slice(0, 10);
}

function normalizeProgramId(value: unknown) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) throw new Error('programId is invalid');
  return numeric;
}

function normalizeRecordType(value: unknown): ExistingRecordType {
  if (value === 'quick' || value === 'detailed') return value;
  throw new Error('recordType is invalid');
}

function normalizeAttendance(value: unknown): ExistingAttendanceStatus {
  if (value === 'pending' || value === 'present' || value === 'absent') return value;
  throw new Error('attendance is invalid');
}

function normalizeSkills(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('skills must be an array');
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeRecordStudentInput(value: unknown): NormalizedClassRecordStudentInput {
  if (!isPlainObject(value)) throw new Error('Invalid record student payload');
  const studentName = textOrNull(value.studentName);
  if (!studentName) throw new Error('studentName is required');

  return {
    studentId: textOrNull(value.studentId),
    studentLegacyId: textOrNull(value.studentLegacyId),
    studentName,
    attendance: normalizeAttendance(value.attendance),
    focused: value.focused === true,
    skills: normalizeSkills(value.skills),
    memo: textOrNull(value.memo),
  };
}

export function normalizeClassRecordInput(body: unknown): NormalizedClassRecordInput {
  if (!isPlainObject(body)) throw new Error('Invalid class record payload');
  const students = body.students;
  if (!Array.isArray(students)) throw new Error('students must be an array');

  return {
    legacyId: textOrNull(body.legacyId),
    date: normalizeDate(body.date),
    lessonTitle: textOrNull(body.lessonTitle),
    classId: textOrNull(body.classId),
    programId: normalizeProgramId(body.programId),
    programTitle: textOrNull(body.programTitle),
    recordType: normalizeRecordType(body.recordType),
    memo: textOrNull(body.memo),
    parentNoteSnapshot: textOrNull(body.parentNoteSnapshot),
    students: students.map(normalizeRecordStudentInput),
  };
}

export function toStudentDto(row: MasterStudentRow): MasterStudentDto {
  return {
    id: row.id,
    legacyId: row.legacy_id,
    name: row.name,
    group: row.group_name,
    meta: row.meta ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toClassRecordDto(row: MasterClassRecordRow): MasterClassRecordDto {
  const students = (row.spokedu_master_class_record_students ?? []).map((student) => ({
    id: student.id,
    studentId: student.student_id,
    studentLegacyId: student.student_legacy_id,
    studentName: student.student_name_snapshot,
    attendance: student.attendance,
    focused: student.focused,
    skills: student.skills ?? [],
    memo: student.memo,
    createdAt: student.created_at,
    updatedAt: student.updated_at,
  }));

  return {
    id: row.id,
    legacyId: row.legacy_id,
    date: row.class_date,
    lessonTitle: row.lesson_title,
    classId: row.class_id,
    programId: row.program_id,
    programTitle: row.program_title,
    recordType: row.record_type,
    memo: row.memo,
    parentNoteSnapshot: row.parent_note_snapshot,
    present: students.filter((student) => student.attendance === 'present').length,
    absent: students.filter((student) => student.attendance === 'absent').length,
    focusCount: students.filter((student) => student.focused).length,
    skillCount: students.reduce((total, student) => total + student.skills.length, 0),
    students,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function studentInsertPayload(input: NormalizedStudentInput, ownerId: string) {
  return {
    owner_id: ownerId,
    legacy_id: input.legacyId,
    name: input.name,
    group_name: input.group,
    meta: input.meta,
  };
}

export function classRecordInsertPayload(input: NormalizedClassRecordInput, ownerId: string) {
  return {
    owner_id: ownerId,
    legacy_id: input.legacyId,
    class_date: input.date,
    lesson_title: input.lessonTitle,
    class_id: input.classId,
    program_id: input.programId,
    program_title: input.programTitle,
    record_type: input.recordType,
    memo: input.memo,
    parent_note_snapshot: input.parentNoteSnapshot,
  };
}

export function classRecordUpdatePayload(input: NormalizedClassRecordInput) {
  return {
    class_date: input.date,
    lesson_title: input.lessonTitle,
    class_id: input.classId,
    program_id: input.programId,
    program_title: input.programTitle,
    record_type: input.recordType,
    memo: input.memo,
    parent_note_snapshot: input.parentNoteSnapshot,
  };
}

export function classRecordStudentInsertPayload(
  student: NormalizedClassRecordStudentInput,
  ownerId: string,
  recordId: string,
  serverStudentId: string | null,
) {
  return {
    owner_id: ownerId,
    record_id: recordId,
    student_id: serverStudentId,
    student_legacy_id: student.studentLegacyId,
    student_name_snapshot: student.studentName,
    attendance: student.attendance,
    focused: student.focused,
    skills: student.skills,
    memo: student.memo,
  };
}

export function classRecordReplaceRpcPayload(
  input: NormalizedClassRecordInput,
  ownerId: string,
  recordId: string,
) {
  return {
    p_owner_id: ownerId,
    p_record_id: recordId,
    p_class_date: input.date,
    p_lesson_title: input.lessonTitle,
    p_class_id: input.classId,
    p_program_id: input.programId,
    p_program_title: input.programTitle,
    p_record_type: input.recordType,
    p_memo: input.memo,
    p_parent_note_snapshot: input.parentNoteSnapshot,
    p_students: input.students.map((student) => ({
      student_id: student.studentId,
      student_legacy_id: student.studentLegacyId,
      student_name_snapshot: student.studentName,
      attendance: student.attendance,
      focused: student.focused,
      skills: student.skills,
      memo: student.memo,
    })),
  };
}
