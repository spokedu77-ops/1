import type {
  LegacyClassRecordImportDto,
  LegacyOperationalImportPreview,
  LegacyStudentImportDto,
} from './legacyOperationalImport';

export type ImportFailure = {
  legacyId: string;
  reason: string;
};

export type OperationalImportResult = {
  status: 'failed' | 'partial' | 'success';
  students: {
    total: number;
    created: number;
    existing: number;
    failed: number;
    failures: ImportFailure[];
  };
  records: {
    total: number;
    created: number;
    existing: number;
    blocked: number;
    failed: number;
    failures: ImportFailure[];
  };
  verified: boolean;
};

export type ImportLegacyOperationalDataInput = {
  backupConfirmed: boolean;
  ownerConfirmed: boolean;
  preview: LegacyOperationalImportPreview;
};

export type OperationalImportProgress = {
  current: number;
  existing: number;
  failed: number;
  stage: 'checking' | 'records' | 'students' | 'verifying';
  total: number;
};

type ImportFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type ImportOptions = {
  fetcher?: ImportFetch;
  onProgress?: (progress: OperationalImportProgress) => void;
};

type StudentDto = {
  id: string;
  legacyId: string | null;
  name: string;
};

type RecordStudentDto = {
  studentId: string | null;
  studentLegacyId: string | null;
  studentName: string;
  attendance: string;
  focused: boolean;
  skills: string[];
  memo: string | null;
};

type RecordDto = {
  id: string;
  legacyId: string | null;
  students: RecordStudentDto[];
};

type ApiListResponse<T> = {
  data?: T[];
};

type ApiPostResponse<T> = {
  data?: T;
  duplicate?: boolean;
  error?: string;
};

function createEmptyResult(preview: LegacyOperationalImportPreview): OperationalImportResult {
  return {
    status: 'failed',
    students: {
      total: preview.students.candidates.length,
      created: 0,
      existing: 0,
      failed: 0,
      failures: [],
    },
    records: {
      total: preview.records.candidates.length,
      created: 0,
      existing: 0,
      blocked: 0,
      failed: 0,
      failures: [],
    },
    verified: false,
  };
}

function mapByLegacyId<T extends { legacyId: string | null }>(items: T[]) {
  const mapped = new Map<string, T>();
  for (const item of items) {
    if (item.legacyId) mapped.set(item.legacyId, item);
  }
  return mapped;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function requestJson<T>(
  fetcher: ImportFetch,
  url: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null; status: number }> {
  const response = await fetcher(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = await readJsonResponse<T & { error?: string }>(response);
  if (!response.ok) {
    const authReason =
      response.status === 401
        ? '로그인이 필요합니다.'
        : response.status === 403
          ? 'SPOKEDU MASTER 접근 권한이 없습니다.'
          : null;
    return {
      data: null,
      error: authReason ?? json.error ?? `HTTP ${response.status}`,
      status: response.status,
    };
  }
  return { data: json, error: null, status: response.status };
}

function hasImportableCandidates(preview: LegacyOperationalImportPreview) {
  return preview.students.candidates.length > 0 || preview.records.candidates.length > 0;
}

export function canRunLegacyOperationalImport(input: ImportLegacyOperationalDataInput) {
  return input.ownerConfirmed && input.backupConfirmed && hasImportableCandidates(input.preview);
}

export async function checkLegacyOperationalImportComplete(
  preview: LegacyOperationalImportPreview,
  options: Pick<ImportOptions, 'fetcher'> = {},
): Promise<boolean> {
  if (!hasImportableCandidates(preview)) return false;
  const fetcher = options.fetcher ?? fetch;
  const serverState = await loadServerState(fetcher);
  const serverStudentByLegacyId = mapByLegacyId(serverState.students);
  const serverRecordByLegacyId = mapByLegacyId(serverState.records);
  const serverStudentIdByLegacyId = new Map<string, string>();

  for (const student of preview.students.candidates) {
    const serverStudent = serverStudentByLegacyId.get(student.legacyId);
    if (!serverStudent) return false;
    serverStudentIdByLegacyId.set(student.legacyId, serverStudent.id);
  }

  for (const record of preview.records.candidates) {
    const serverRecord = serverRecordByLegacyId.get(record.legacyId);
    if (!serverRecord) return false;
    if (!verifyRecord(record, serverRecord, serverStudentIdByLegacyId)) return false;
  }

  return true;
}

function buildStudentPayload(student: LegacyStudentImportDto) {
  return {
    legacyId: student.legacyId,
    name: student.name,
    group: student.group,
    meta: student.meta,
  };
}

function buildRecordPayload(
  record: LegacyClassRecordImportDto,
  serverStudentIdByLegacyId: Map<string, string>,
  localStudentLegacyIds: Set<string>,
) {
  const blockedBy: string[] = [];
  const students = record.students.map((student) => {
    const legacyId = student.studentLegacyId;
    const serverStudentId = legacyId ? serverStudentIdByLegacyId.get(legacyId) : null;
    if (legacyId && localStudentLegacyIds.has(legacyId) && !serverStudentId) {
      blockedBy.push(legacyId);
    }
    return {
      studentId: serverStudentId ?? null,
      studentLegacyId: legacyId,
      studentName: student.studentName,
      attendance: student.attendance,
      focused: student.focused,
      skills: student.skills,
      memo: student.memo,
    };
  });

  if (blockedBy.length > 0) {
    return {
      blockedReason: `학생 import 실패로 기록을 보류했습니다: ${blockedBy.join(', ')}`,
      payload: null,
    };
  }

  return {
    blockedReason: null,
    payload: {
      legacyId: record.legacyId,
      date: record.date,
      lessonTitle: record.lessonTitle,
      classId: record.classId,
      programId: record.programId,
      programTitle: record.programTitle,
      recordType: record.recordType,
      memo: record.memo,
      parentNoteSnapshot: record.parentNoteSnapshot,
      students,
    },
  };
}

function normalizeMemo(value: string | null | undefined) {
  return value ?? null;
}

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function verifyRecord(record: LegacyClassRecordImportDto, serverRecord: RecordDto, serverStudentIdByLegacyId: Map<string, string>) {
  if (record.students.length !== serverRecord.students.length) return false;
  for (const expected of record.students) {
    const actual = serverRecord.students.find((student) => student.studentLegacyId === expected.studentLegacyId);
    if (!actual) return false;
    const expectedStudentId = expected.studentLegacyId
      ? serverStudentIdByLegacyId.get(expected.studentLegacyId) ?? null
      : null;
    if (actual.studentId !== expectedStudentId) return false;
    if (actual.studentName !== expected.studentName) return false;
    if (actual.attendance !== expected.attendance) return false;
    if (actual.focused !== expected.focused) return false;
    if (!arraysEqual(actual.skills ?? [], expected.skills)) return false;
    if (normalizeMemo(actual.memo) !== normalizeMemo(expected.memo)) return false;
  }
  return true;
}

async function loadServerState(fetcher: ImportFetch) {
  const [studentsResponse, recordsResponse] = await Promise.all([
    requestJson<ApiListResponse<StudentDto>>(fetcher, '/api/spokedu-master/students'),
    requestJson<ApiListResponse<RecordDto>>(fetcher, '/api/spokedu-master/class-records'),
  ]);

  if (studentsResponse.error) throw new Error(studentsResponse.error);
  if (recordsResponse.error) throw new Error(recordsResponse.error);

  return {
    records: recordsResponse.data?.data ?? [],
    students: studentsResponse.data?.data ?? [],
  };
}

export async function importLegacyOperationalData(
  input: ImportLegacyOperationalDataInput,
  options: ImportOptions = {},
): Promise<OperationalImportResult> {
  const result = createEmptyResult(input.preview);
  const fetcher = options.fetcher ?? fetch;
  const onProgress = options.onProgress;

  if (!canRunLegacyOperationalImport(input)) {
    result.students.failures.push({
      legacyId: 'precondition',
      reason: '소유 확인, 원본 백업, 가져오기 후보가 모두 필요합니다.',
    });
    return result;
  }

  let initialState;
  try {
    onProgress?.({ current: 0, existing: 0, failed: 0, stage: 'checking', total: 2 });
    initialState = await loadServerState(fetcher);
  } catch (error) {
    result.students.failures.push({
      legacyId: 'server-check',
      reason: error instanceof Error ? error.message : '서버 현황 조회 실패',
    });
    return result;
  }

  const existingStudentByLegacyId = mapByLegacyId(initialState.students);
  const existingRecordByLegacyId = mapByLegacyId(initialState.records);
  const serverStudentIdByLegacyId = new Map<string, string>();
  const failedStudentLegacyIds = new Set<string>();
  const localStudentLegacyIds = new Set(input.preview.students.candidates.map((student) => student.legacyId));

  for (const [legacyId, student] of existingStudentByLegacyId) {
    serverStudentIdByLegacyId.set(legacyId, student.id);
  }

  for (const [index, student] of input.preview.students.candidates.entries()) {
    onProgress?.({
      current: index,
      existing: result.students.existing,
      failed: result.students.failed,
      stage: 'students',
      total: input.preview.students.candidates.length,
    });
    const existing = existingStudentByLegacyId.get(student.legacyId);
    if (existing) {
      result.students.existing += 1;
      serverStudentIdByLegacyId.set(student.legacyId, existing.id);
      continue;
    }

    const response = await requestJson<ApiPostResponse<StudentDto>>(fetcher, '/api/spokedu-master/students', {
      body: JSON.stringify(buildStudentPayload(student)),
      method: 'POST',
    });

    if (response.error || !response.data?.data) {
      result.students.failed += 1;
      result.students.failures.push({
        legacyId: student.legacyId,
        reason: response.error ?? '학생 저장 응답이 올바르지 않습니다.',
      });
      failedStudentLegacyIds.add(student.legacyId);
      continue;
    }

    if (response.data.duplicate) {
      result.students.existing += 1;
    } else {
      result.students.created += 1;
    }
    serverStudentIdByLegacyId.set(student.legacyId, response.data.data.id);
  }

  for (const [index, record] of input.preview.records.candidates.entries()) {
    onProgress?.({
      current: index,
      existing: result.records.existing,
      failed: result.records.failed,
      stage: 'records',
      total: input.preview.records.candidates.length,
    });
    const existing = existingRecordByLegacyId.get(record.legacyId);
    if (existing) {
      result.records.existing += 1;
      continue;
    }

    const failedChildLegacyId = record.students.find(
      (student) =>
        student.studentLegacyId &&
        localStudentLegacyIds.has(student.studentLegacyId) &&
        failedStudentLegacyIds.has(student.studentLegacyId),
    )?.studentLegacyId;

    if (failedChildLegacyId) {
      result.records.blocked += 1;
      result.records.failures.push({
        legacyId: record.legacyId,
        reason: `학생 import 실패로 기록을 보류했습니다: ${failedChildLegacyId}`,
      });
      continue;
    }

    const { blockedReason, payload } = buildRecordPayload(record, serverStudentIdByLegacyId, localStudentLegacyIds);
    if (!payload) {
      result.records.blocked += 1;
      result.records.failures.push({
        legacyId: record.legacyId,
        reason: blockedReason ?? '기록 payload를 만들 수 없습니다.',
      });
      continue;
    }

    const response = await requestJson<ApiPostResponse<RecordDto>>(fetcher, '/api/spokedu-master/class-records', {
      body: JSON.stringify(payload),
      method: 'POST',
    });

    if (response.error || !response.data?.data) {
      result.records.failed += 1;
      result.records.failures.push({
        legacyId: record.legacyId,
        reason: response.error ?? '수업 기록 저장 응답이 올바르지 않습니다.',
      });
      continue;
    }

    if (response.data.duplicate) {
      result.records.existing += 1;
    } else {
      result.records.created += 1;
    }
  }

  try {
    onProgress?.({ current: 0, existing: 0, failed: 0, stage: 'verifying', total: 2 });
    const finalState = await loadServerState(fetcher);
    const finalStudentByLegacyId = mapByLegacyId(finalState.students);
    const finalRecordByLegacyId = mapByLegacyId(finalState.records);

    for (const student of input.preview.students.candidates) {
      if (failedStudentLegacyIds.has(student.legacyId)) continue;
      const serverStudent = finalStudentByLegacyId.get(student.legacyId);
      if (!serverStudent) {
        result.students.failed += 1;
        result.students.failures.push({ legacyId: student.legacyId, reason: '최종 조회에서 학생을 찾지 못했습니다.' });
      } else {
        serverStudentIdByLegacyId.set(student.legacyId, serverStudent.id);
      }
    }

    for (const record of input.preview.records.candidates) {
      if (result.records.failures.some((failure) => failure.legacyId === record.legacyId)) continue;
      const serverRecord = finalRecordByLegacyId.get(record.legacyId);
      if (!serverRecord) {
        result.records.failed += 1;
        result.records.failures.push({ legacyId: record.legacyId, reason: '최종 조회에서 수업 기록을 찾지 못했습니다.' });
        continue;
      }
      if (!verifyRecord(record, serverRecord, serverStudentIdByLegacyId)) {
        result.records.failed += 1;
        result.records.failures.push({ legacyId: record.legacyId, reason: '최종 조회의 child 연결 값이 후보와 다릅니다.' });
      }
    }

    result.verified = result.students.failed === 0 && result.records.failed === 0 && result.records.blocked === 0;
  } catch (error) {
    result.records.failures.push({
      legacyId: 'verify',
      reason: error instanceof Error ? error.message : '최종 검증 실패',
    });
    result.verified = false;
  }

  const savedCount =
    result.students.created +
    result.students.existing +
    result.records.created +
    result.records.existing;
  const hasProblem = result.students.failed > 0 || result.records.failed > 0 || result.records.blocked > 0;

  if (!hasProblem && result.verified) {
    result.status = 'success';
  } else if (savedCount > 0) {
    result.status = 'partial';
  } else {
    result.status = 'failed';
  }

  return result;
}
