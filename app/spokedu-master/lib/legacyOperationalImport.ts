import {
  ensureLegacyOperationalArchive,
  LEGACY_OPERATIONAL_ARCHIVE_KEY,
  LEGACY_OPERATIONAL_SOURCE_KEY,
  type LegacyOperationalArchive,
} from './legacyOperationalArchive';

export const LEGACY_OPERATIONAL_STORE_KEY = LEGACY_OPERATIONAL_SOURCE_KEY;

export type LegacyOperationalPreviewSource = 'active-persist-fallback' | 'legacy-archive' | 'none';

export type LegacyImportIssue = {
  scope: 'student' | 'record' | 'recordStudent';
  legacyId?: string;
  reason: string;
};

export type MasterStudentMeta = string | Record<string, unknown>;

export type LegacyStudentImportDto = {
  legacyId: string;
  name: string;
  group: string;
  meta: MasterStudentMeta;
};

export type LegacyClassRecordStudentImportDto = {
  studentId: null;
  studentLegacyId: string | null;
  studentName: string;
  attendance: 'pending' | 'present' | 'absent';
  focused: boolean;
  skills: string[];
  memo: string | null;
};

export type LegacyClassRecordImportDto = {
  legacyId: string;
  date: string;
  lessonTitle: string | null;
  classId: string | null;
  programId: number | null;
  programTitle: string | null;
  recordType: 'quick' | 'detailed';
  memo: string | null;
  parentNoteSnapshot: string | null;
  students: LegacyClassRecordStudentImportDto[];
};

export type LegacyOperationalImportPreview = {
  archive: LegacyOperationalArchive | null;
  archiveError: string | null;
  archiveReady: boolean;
  sourceVersion: number | null;
  source: LegacyOperationalPreviewSource;
  rawBackupAvailable: boolean;
  rawBackup: string | null;
  parsedStore: unknown;
  students: {
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
    candidates: LegacyStudentImportDto[];
    issues: LegacyImportIssue[];
    stringMetaPreserved: number;
    objectMetaPreserved: number;
    invalidMetaCoerced: number;
  };
  records: {
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
    orphanStudentEntries: number;
    excludedChildEntries: number;
    recordTypeDefaulted: number;
    candidates: LegacyClassRecordImportDto[];
    issues: LegacyImportIssue[];
  };
  excludedLegacyFields: string[];
};

const EXCLUDED_LEGACY_FIELDS = [
  'attendance',
  'badges',
  'classes',
  'history',
  'level',
  'risk',
  'skills',
  'streak',
];

const VALID_ATTENDANCE = new Set(['pending', 'present', 'absent']);
const VALID_RECORD_TYPES = new Set(['quick', 'detailed']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function textOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMeta(value: unknown): {
  kind: 'empty' | 'invalid' | 'object' | 'string';
  meta: MasterStudentMeta;
} {
  if (typeof value === 'string') return { kind: 'string', meta: value };
  if (value == null) return { kind: 'empty', meta: {} };
  if (isPlainObject(value)) return { kind: 'object', meta: { ...value } };
  return { kind: 'invalid', meta: {} };
}

function normalizeProgramId(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
}

function normalizeDate(value: unknown): string | null {
  const raw = textOrNull(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function createEmptyPreview(
  rawBackup: string | null = null,
  parsedStore: unknown = null,
  source: LegacyOperationalPreviewSource = 'none',
  archive: LegacyOperationalArchive | null = null,
): LegacyOperationalImportPreview {
  return {
    archive,
    archiveError: null,
    archiveReady: source === 'legacy-archive',
    sourceVersion: null,
    source,
    rawBackupAvailable: Boolean(rawBackup),
    rawBackup,
    parsedStore,
    students: {
      total: 0,
      valid: 0,
      duplicate: 0,
      invalid: 0,
      candidates: [],
      issues: [],
      stringMetaPreserved: 0,
      objectMetaPreserved: 0,
      invalidMetaCoerced: 0,
    },
    records: {
      total: 0,
      valid: 0,
      duplicate: 0,
      invalid: 0,
      orphanStudentEntries: 0,
      excludedChildEntries: 0,
      recordTypeDefaulted: 0,
      candidates: [],
      issues: [],
    },
    excludedLegacyFields: [],
  };
}

function normalizeStudent(
  value: unknown,
  seenLegacyIds: Set<string>,
  excludedLegacyFields: Set<string>,
): { candidate: LegacyStudentImportDto | null; duplicate: boolean; issue?: LegacyImportIssue } {
  if (!isPlainObject(value)) {
    return { candidate: null, duplicate: false, issue: { scope: 'student', reason: '학생 데이터 구조가 올바르지 않습니다.' } };
  }

  for (const field of EXCLUDED_LEGACY_FIELDS) {
    if (field in value) excludedLegacyFields.add(field);
  }

  const legacyId = textOrNull(value.id);
  const name = textOrNull(value.name);
  if (!legacyId) {
    return { candidate: null, duplicate: false, issue: { scope: 'student', reason: '학생 legacyId가 없습니다.' } };
  }
  if (!name) {
    return { candidate: null, duplicate: false, issue: { scope: 'student', legacyId, reason: '학생 이름이 없습니다.' } };
  }
  if (seenLegacyIds.has(legacyId)) {
    return { candidate: null, duplicate: true, issue: { scope: 'student', legacyId, reason: '중복 학생 legacyId입니다.' } };
  }

  const normalizedMeta = normalizeMeta(value.meta);
  seenLegacyIds.add(legacyId);
  return {
    candidate: {
      legacyId,
      name,
      group: textOrEmpty(value.group),
      meta: normalizedMeta.meta,
    },
    duplicate: false,
    issue:
      normalizedMeta.kind === 'invalid'
        ? { scope: 'student', legacyId, reason: '지원하지 않는 meta 형식이라 빈 object로 보정했습니다.' }
        : undefined,
  };
}

function normalizeRecordStudent(
  value: unknown,
  knownStudentIds: Set<string>,
): {
  candidate: LegacyClassRecordStudentImportDto | null;
  orphan: boolean;
  excluded: boolean;
  issue?: LegacyImportIssue;
} {
  if (!isPlainObject(value)) {
    return {
      candidate: null,
      orphan: false,
      excluded: true,
      issue: { scope: 'recordStudent', reason: '학생별 기록 구조가 올바르지 않습니다.' },
    };
  }

  const studentLegacyId = textOrNull(value.studentId);
  const studentName = textOrNull(value.studentName);
  if (!studentLegacyId && !studentName) {
    return {
      candidate: null,
      orphan: false,
      excluded: true,
      issue: { scope: 'recordStudent', reason: '학생 ID와 이름 snapshot이 모두 없습니다.' },
    };
  }

  const attendance = textOrNull(value.attendance);
  if (!attendance || !VALID_ATTENDANCE.has(attendance)) {
    return {
      candidate: null,
      orphan: false,
      excluded: true,
      issue: {
        scope: 'recordStudent',
        legacyId: studentLegacyId ?? undefined,
        reason: '허용되지 않은 출결 값입니다.',
      },
    };
  }

  const orphan = Boolean(studentLegacyId && !knownStudentIds.has(studentLegacyId) && studentName);
  return {
    candidate: {
      studentId: null,
      studentLegacyId,
      studentName: studentName ?? '이름 없는 과거 기록',
      attendance: attendance as LegacyClassRecordStudentImportDto['attendance'],
      focused: value.focused === true,
      skills: normalizeSkills(value.skills),
      memo: textOrNull(value.memo),
    },
    orphan,
    excluded: false,
    issue: orphan
      ? {
          scope: 'recordStudent',
          legacyId: studentLegacyId ?? undefined,
          reason: '학생 목록에는 없지만 이름 snapshot이 있어 과거 기록으로 보존합니다.',
        }
      : undefined,
  };
}

function normalizeRecord(
  value: unknown,
  seenLegacyIds: Set<string>,
  knownStudentIds: Set<string>,
): {
  candidate: LegacyClassRecordImportDto | null;
  duplicate: boolean;
  orphanStudentEntries: number;
  excludedChildEntries: number;
  recordTypeDefaulted: boolean;
  issues: LegacyImportIssue[];
} {
  const issues: LegacyImportIssue[] = [];
  if (!isPlainObject(value)) {
    return {
      candidate: null,
      duplicate: false,
      orphanStudentEntries: 0,
      excludedChildEntries: 0,
      recordTypeDefaulted: false,
      issues: [{ scope: 'record', reason: '수업 기록 구조가 올바르지 않습니다.' }],
    };
  }

  const legacyId = textOrNull(value.id);
  if (!legacyId) {
    return {
      candidate: null,
      duplicate: false,
      orphanStudentEntries: 0,
      excludedChildEntries: 0,
      recordTypeDefaulted: false,
      issues: [{ scope: 'record', reason: '수업 기록 legacyId가 없습니다.' }],
    };
  }

  if (seenLegacyIds.has(legacyId)) {
    return {
      candidate: null,
      duplicate: true,
      orphanStudentEntries: 0,
      excludedChildEntries: 0,
      recordTypeDefaulted: false,
      issues: [{ scope: 'record', legacyId, reason: '중복 수업 기록 legacyId입니다.' }],
    };
  }

  const date = normalizeDate(value.date);
  if (!date) {
    return {
      candidate: null,
      duplicate: false,
      orphanStudentEntries: 0,
      excludedChildEntries: 0,
      recordTypeDefaulted: false,
      issues: [{ scope: 'record', legacyId, reason: '유효하지 않은 수업 날짜입니다.' }],
    };
  }

  const explicitRecordType = textOrNull(value.recordType);
  const recordTypeDefaulted = !explicitRecordType;
  const recordType = explicitRecordType ?? 'detailed';
  if (!VALID_RECORD_TYPES.has(recordType)) {
    return {
      candidate: null,
      duplicate: false,
      orphanStudentEntries: 0,
      excludedChildEntries: 0,
      recordTypeDefaulted: false,
      issues: [{ scope: 'record', legacyId, reason: '허용되지 않은 수업 기록 유형입니다.' }],
    };
  }
  if (recordTypeDefaulted) {
    issues.push({
      scope: 'record',
      legacyId,
      reason: '기존 상세 기록 생성 경로의 recordType 누락값을 detailed로 보정했습니다.',
    });
  }

  const rawStudents = Array.isArray(value.students) ? value.students : [];
  let orphanStudentEntries = 0;
  let excludedChildEntries = 0;
  const students: LegacyClassRecordStudentImportDto[] = [];

  for (const student of rawStudents) {
    const normalized = normalizeRecordStudent(student, knownStudentIds);
    if (normalized.issue) issues.push({ ...normalized.issue, legacyId: normalized.issue.legacyId ?? legacyId });
    if (normalized.orphan) orphanStudentEntries += 1;
    if (normalized.excluded) excludedChildEntries += 1;
    if (normalized.candidate) students.push(normalized.candidate);
  }

  if (students.length === 0) {
    return {
      candidate: null,
      duplicate: false,
      orphanStudentEntries,
      excludedChildEntries,
      recordTypeDefaulted,
      issues: [
        ...issues,
        { scope: 'record', legacyId, reason: '가져올 수 있는 학생별 기록이 없습니다.' },
      ],
    };
  }

  seenLegacyIds.add(legacyId);
  return {
    candidate: {
      legacyId,
      date,
      lessonTitle: textOrNull(value.lessonTitle),
      classId: textOrNull(value.classId),
      programId: normalizeProgramId(value.programId),
      programTitle: textOrNull(value.programTitle),
      recordType: recordType as LegacyClassRecordImportDto['recordType'],
      memo: textOrNull(value.memo),
      parentNoteSnapshot: textOrNull(value.parentNoteSnapshot),
      students,
    },
    duplicate: false,
    orphanStudentEntries,
    excludedChildEntries,
    recordTypeDefaulted,
    issues,
  };
}

export function parseLegacyOperationalStore(
  raw: string | null,
  source: LegacyOperationalPreviewSource = raw == null ? 'none' : 'active-persist-fallback',
  archive: LegacyOperationalArchive | null = null,
): LegacyOperationalImportPreview {
  if (raw == null) return createEmptyPreview(null, null, source, archive);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const preview = createEmptyPreview(raw, null, source, archive);
    preview.students.issues.push({ scope: 'student', reason: 'spokedu-master-store JSON을 파싱할 수 없습니다.' });
    preview.records.issues.push({ scope: 'record', reason: 'spokedu-master-store JSON을 파싱할 수 없습니다.' });
    return preview;
  }

  if (!isPlainObject(parsed) || !isPlainObject(parsed.state)) {
    const preview = createEmptyPreview(raw, parsed, source, archive);
    preview.students.issues.push({ scope: 'student', reason: 'Zustand persist state 구조가 아닙니다.' });
    preview.records.issues.push({ scope: 'record', reason: 'Zustand persist state 구조가 아닙니다.' });
    return preview;
  }

  const sourceVersion = typeof parsed.version === 'number' ? parsed.version : null;
  const rawStudents = parsed.state.students;
  const rawRecords = parsed.state.classRecords;
  const preview = createEmptyPreview(raw, parsed, source, archive);
  preview.sourceVersion = sourceVersion;

  if (!Array.isArray(rawStudents)) {
    preview.students.issues.push({ scope: 'student', reason: 'state.students 배열을 찾을 수 없습니다.' });
    return preview;
  }
  if (!Array.isArray(rawRecords)) {
    preview.records.issues.push({ scope: 'record', reason: 'state.classRecords 배열을 찾을 수 없습니다.' });
    return preview;
  }

  const seenStudentIds = new Set<string>();
  const excludedLegacyFields = new Set<string>();
  preview.students.total = rawStudents.length;

  for (const student of rawStudents) {
    const normalized = normalizeStudent(student, seenStudentIds, excludedLegacyFields);
    if (normalized.issue) preview.students.issues.push(normalized.issue);
    if (normalized.duplicate) preview.students.duplicate += 1;
    if (normalized.candidate) {
      if (typeof normalized.candidate.meta === 'string') {
        preview.students.stringMetaPreserved += 1;
      } else if (Object.keys(normalized.candidate.meta).length > 0) {
        preview.students.objectMetaPreserved += 1;
      }
      if (normalized.issue?.reason.includes('meta')) {
        preview.students.invalidMetaCoerced += 1;
      }
      preview.students.candidates.push(normalized.candidate);
    }
  }

  preview.students.valid = preview.students.candidates.length;
  preview.students.invalid = preview.students.total - preview.students.valid - preview.students.duplicate;

  const seenRecordIds = new Set<string>();
  preview.records.total = rawRecords.length;

  for (const record of rawRecords) {
    const normalized = normalizeRecord(record, seenRecordIds, seenStudentIds);
    preview.records.issues.push(...normalized.issues);
    if (normalized.duplicate) preview.records.duplicate += 1;
    if (normalized.candidate) preview.records.candidates.push(normalized.candidate);
    preview.records.orphanStudentEntries += normalized.orphanStudentEntries;
    preview.records.excludedChildEntries += normalized.excludedChildEntries;
    if (normalized.recordTypeDefaulted) preview.records.recordTypeDefaulted += 1;
  }

  preview.records.valid = preview.records.candidates.length;
  preview.records.invalid = preview.records.total - preview.records.valid - preview.records.duplicate;
  preview.excludedLegacyFields = Array.from(excludedLegacyFields).sort();

  return preview;
}

export function readLegacyOperationalPreview(storage: Storage): LegacyOperationalImportPreview {
  const archiveResult = ensureLegacyOperationalArchive(storage);
  if (archiveResult.ok && archiveResult.archive) {
    const raw = JSON.stringify({
      state: {
        students: archiveResult.archive.students,
        classRecords: archiveResult.archive.classRecords,
      },
      version: archiveResult.archive.sourceStoreVersion,
    });
    return parseLegacyOperationalStore(raw, 'legacy-archive', archiveResult.archive);
  }

  const activeRaw = storage.getItem(LEGACY_OPERATIONAL_STORE_KEY);
  const preview = parseLegacyOperationalStore(activeRaw, activeRaw == null ? 'none' : 'active-persist-fallback');
  if (!archiveResult.ok) {
    preview.archiveError = archiveResult.reason;
    preview.archiveReady = false;
  }
  return preview;
}

export function buildLegacyOperationalBackupFileName(now = new Date()): string {
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-');
  return `spokedu-master-local-backup-${timestamp}.json`;
}

export function buildLegacyOperationalBackupJson(preview: LegacyOperationalImportPreview): string {
  if (preview.archive) {
    return JSON.stringify(
      {
        archive: preview.archive,
        exportedAt: new Date().toISOString(),
        key: LEGACY_OPERATIONAL_ARCHIVE_KEY,
        preview,
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      key: LEGACY_OPERATIONAL_STORE_KEY,
      parsed: preview.parsedStore,
      preview,
      raw: preview.rawBackup,
    },
    null,
    2,
  );
}
