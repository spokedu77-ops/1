import type { MasterStudentDto, MasterStudentMeta } from '@/app/spokedu-master/types/operational';
import type {
  ExistingAttendanceStatus,
  ExistingRecordType,
  MasterClassRecordDto,
  ObservationScore,
} from '@/app/spokedu-master/types/legacyOperational';

export type MasterStudentRow = {
  id: string;
  owner_id: string;
  legacy_id: string | null;
  name: string;
  group_name: string | null;
  meta: MasterStudentMeta;
  guidance_note?: string | null;
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
  observation_score?: ObservationScore | null;
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
  application_idea?: string | null;
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
  guidanceNote?: string | null;
  classIds: string[];
};

export type NormalizedClassRecordStudentInput = {
  studentId: string | null;
  studentLegacyId: string | null;
  studentName: string;
  attendance: ExistingAttendanceStatus;
  focused: boolean;
  skills: string[];
  memo: string | null;
  observationScore: ObservationScore | null;
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
  applicationIdea: string | null;
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
  const classIds = body.classIds == null ? [] : body.classIds;
  if (!Array.isArray(classIds) || classIds.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new Error('classIds must be an array of ids');
  }
  if (new Set(classIds).size !== classIds.length) throw new Error('classIds must not contain duplicates');

  return {
    legacyId: textOrNull(body.legacyId),
    name,
    group: textOrNull(body.group),
    meta: normalizeMeta(body.meta),
    ...(Object.hasOwn(body, 'guidanceNote') ? { guidanceNote: textOrNull(body.guidanceNote) } : {}),
    classIds: classIds.map((id) => id.trim()),
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
  if (value === 'quick' || value === 'detailed' || value === 'lesson_note') return value;
  throw new Error('recordType is invalid');
}

function normalizeObservationScore(value: unknown): ObservationScore | null {
  if (value == null) return null;
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('observationScore is invalid');
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
    observationScore: normalizeObservationScore(value.observationScore),
  };
}

export function normalizeClassRecordInput(body: unknown): NormalizedClassRecordInput {
  if (!isPlainObject(body)) throw new Error('Invalid class record payload');
  const students = body.students;
  if (!Array.isArray(students)) throw new Error('students must be an array');

  const normalized = {
    legacyId: textOrNull(body.legacyId),
    date: normalizeDate(body.date),
    lessonTitle: textOrNull(body.lessonTitle),
    classId: textOrNull(body.classId),
    programId: normalizeProgramId(body.programId),
    programTitle: textOrNull(body.programTitle),
    recordType: normalizeRecordType(body.recordType),
    memo: textOrNull(body.memo),
    applicationIdea: textOrNull(body.applicationIdea),
    parentNoteSnapshot: textOrNull(body.parentNoteSnapshot),
    students: students.map(normalizeRecordStudentInput),
  };
  if (normalized.recordType === 'lesson_note') {
    if (!normalized.programId || !normalized.memo) {
      throw new Error('lesson_note requires programId and memo');
    }
    if (normalized.students.length > 0) {
      throw new Error('lesson_note students must be empty');
    }
  }
  return normalized;
}

export function toStudentDto(row: MasterStudentRow): MasterStudentDto {
  return {
    id: row.id,
    legacyId: row.legacy_id,
    name: row.name,
    meta: row.meta ?? {},
    guidanceNote: row.guidance_note ?? null,
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
    observationScore: student.observation_score ?? null,
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
    applicationIdea: row.application_idea ?? null,
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
    guidance_note: input.guidanceNote ?? null,
  };
}

export function studentUpdatePayload(input: NormalizedStudentInput) {
  return {
    name: input.name,
    group_name: input.group,
    meta: input.meta,
    ...(input.guidanceNote !== undefined ? { guidance_note: input.guidanceNote } : {}),
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
    application_idea: input.applicationIdea,
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
    application_idea: input.applicationIdea,
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
    observation_score: student.observationScore ?? null,
  };
}

function classRecordRpcStudents(input: NormalizedClassRecordInput) {
  return input.students.map((student) => ({
    student_id: student.studentId,
    student_legacy_id: student.studentLegacyId,
    student_name_snapshot: student.studentName,
    attendance: student.attendance,
    focused: student.focused,
    skills: student.skills,
    memo: student.memo,
    observation_score: student.observationScore ?? null,
  }));
}

export function classRecordCreateRpcPayload(input: NormalizedClassRecordInput, ownerId: string) {
  return {
    p_owner_id: ownerId,
    p_legacy_id: input.legacyId,
    p_class_date: input.date,
    p_lesson_title: input.lessonTitle,
    p_class_id: input.classId,
    p_program_id: input.programId,
    p_program_title: input.programTitle,
    p_record_type: input.recordType,
    p_memo: input.memo,
    p_application_idea: input.applicationIdea,
    p_parent_note_snapshot: input.parentNoteSnapshot,
    p_students: classRecordRpcStudents(input),
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
    p_application_idea: input.applicationIdea,
    p_parent_note_snapshot: input.parentNoteSnapshot,
    p_students: classRecordRpcStudents(input),
  };
}
