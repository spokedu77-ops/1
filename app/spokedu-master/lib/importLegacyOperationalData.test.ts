import { describe, expect, it, vi } from 'vitest';
import {
  canRunLegacyOperationalImport,
  importLegacyOperationalData,
  verifyLegacyOperationalImportComplete,
  type OperationalImportProgress,
} from './importLegacyOperationalData';
import type { LegacyOperationalImportPreview } from './legacyOperationalImport';

function preview(overrides: Partial<LegacyOperationalImportPreview> = {}): LegacyOperationalImportPreview {
  return {
    archive: {
      archiveVersion: 1,
      sourceKey: 'spokedu-master-store',
      sourceStoreVersion: 11,
      capturedAt: '2026-06-17T00:00:00.000Z',
      students: [],
      classRecords: [],
    },
    archiveError: null,
    archiveReady: true,
    source: 'legacy-archive',
    sourceVersion: 11,
    rawBackupAvailable: true,
    rawBackup: '{"state":{"students":[],"classRecords":[]}}',
    parsedStore: {},
    students: {
      total: 1,
      valid: 1,
      duplicate: 0,
      invalid: 0,
      candidates: [
        {
          legacyId: 'student-1',
          name: '학생 1',
          group: 'A',
          meta: '만 8세 / 수강 6개월',
        },
      ],
      issues: [],
      stringMetaPreserved: 1,
      objectMetaPreserved: 0,
      invalidMetaCoerced: 0,
    },
    records: {
      total: 1,
      valid: 1,
      duplicate: 0,
      invalid: 0,
      orphanStudentEntries: 0,
      excludedChildEntries: 0,
      recordTypeDefaulted: 0,
      candidates: [
        {
          legacyId: 'record-1',
          date: '2026-06-17',
          lessonTitle: '수업',
          classId: 'A',
          programId: 52,
          programTitle: '프로그램',
          recordType: 'detailed',
          memo: '메모',
          parentNoteSnapshot: '학부모',
          students: [
            {
              studentId: null,
              studentLegacyId: 'student-1',
              studentName: '학생 1',
              attendance: 'present',
              focused: true,
              skills: ['협응력'],
              memo: '관찰',
            },
          ],
        },
      ],
      issues: [],
    },
    excludedLegacyFields: [],
    ...overrides,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status });
}

function createFetchMock(options: {
  existingRecords?: unknown[];
  existingStudents?: unknown[];
  failRecord?: boolean;
  failStudent?: boolean;
  forbidden?: boolean;
  finalRecords?: unknown[];
  finalStudents?: unknown[];
}) {
  const calls: Array<{ body: unknown; method: string; url: string }> = [];
  let studentGetCount = 0;
  let recordGetCount = 0;
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ body, method, url });

    if (options.forbidden) return json({ error: 'forbidden' }, 403);

    if (url === '/api/spokedu-master/students' && method === 'GET') {
      studentGetCount += 1;
      return json({
        data: studentGetCount > 1 ? (options.finalStudents ?? options.existingStudents ?? []) : (options.existingStudents ?? []),
      });
    }

    if (url === '/api/spokedu-master/class-records' && method === 'GET') {
      recordGetCount += 1;
      return json({
        data: recordGetCount > 1 ? (options.finalRecords ?? options.existingRecords ?? []) : (options.existingRecords ?? []),
      });
    }

    if (url === '/api/spokedu-master/students' && method === 'POST') {
      if (options.failStudent) return json({ error: 'student failed' }, 500);
      return json({ data: { id: serverStudentId, legacyId: body.legacyId, name: body.name }, duplicate: false }, 201);
    }

    if (url === '/api/spokedu-master/class-records' && method === 'POST') {
      if (options.failRecord) return json({ error: 'record failed' }, 500);
      return json({ data: { id: 'server-record-1', legacyId: body.legacyId, students: body.students }, duplicate: false }, 201);
    }

    return json({ error: 'not found' }, 404);
  });

  return { calls, fetcher };
}

const serverStudentId = '11111111-1111-4111-8111-111111111111';
const serverStudent = { id: serverStudentId, legacyId: 'student-1', name: '학생 1' };
const serverRecord = {
  id: 'server-record-1',
  legacyId: 'record-1',
  students: [
    {
      studentId: serverStudentId,
      studentLegacyId: 'student-1',
      studentName: '학생 1',
      attendance: 'present',
      focused: true,
      skills: ['협응력'],
      memo: '관찰',
    },
  ],
};

describe('legacy operational import execution', () => {
  it('keeps import disabled before owner confirmation', () => {
    expect(canRunLegacyOperationalImport({ preview: preview(), ownerConfirmed: false, backupConfirmed: true })).toBe(false);
  });

  it('keeps import disabled before backup confirmation', () => {
    expect(canRunLegacyOperationalImport({ preview: preview(), ownerConfirmed: true, backupConfirmed: false })).toBe(false);
  });

  it('keeps import disabled when the legacy archive is not verified', () => {
    expect(
      canRunLegacyOperationalImport({
        preview: preview({ archive: null, archiveError: 'archive failed', archiveReady: false, source: 'active-persist-fallback' }),
        ownerConfirmed: true,
        backupConfirmed: true,
      }),
    ).toBe(false);
  });

  it('imports students before records', async () => {
    const { calls, fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });
    await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /api/spokedu-master/students',
      'GET /api/spokedu-master/class-records',
      'POST /api/spokedu-master/students',
      'POST /api/spokedu-master/class-records',
      'GET /api/spokedu-master/students',
      'GET /api/spokedu-master/class-records',
    ]);
  });

  it('marks existing server students without posting them', async () => {
    const { calls, fetcher } = createFetchMock({ existingStudents: [serverStudent], finalStudents: [serverStudent], finalRecords: [serverRecord] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.students.existing).toBe(1);
    expect(calls.some((call) => call.method === 'POST' && call.url.endsWith('/students'))).toBe(false);
  });

  it('connects a newly created student UUID to child rows', async () => {
    const { calls, fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });
    await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    const recordPost = calls.find((call) => call.method === 'POST' && call.url.endsWith('/class-records'));
    expect(recordPost?.body).toMatchObject({
      students: [{ studentId: serverStudentId, studentLegacyId: 'student-1' }],
    });
  });

  it('keeps true orphan child studentId null', async () => {
    const orphanPreview = preview({
      students: { ...preview().students, candidates: [] },
      records: {
        ...preview().records,
        candidates: [
          {
            ...preview().records.candidates[0],
            students: [{ ...preview().records.candidates[0].students[0], studentLegacyId: 'missing-student' }],
          },
        ],
      },
    });
    const orphanRecord = {
      ...serverRecord,
      students: [{ ...serverRecord.students[0], studentId: null, studentLegacyId: 'missing-student' }],
    };
    const { calls, fetcher } = createFetchMock({ finalRecords: [orphanRecord], finalStudents: [] });
    const result = await importLegacyOperationalData({ preview: orphanPreview, ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    const recordPost = calls.find((call) => call.method === 'POST' && call.url.endsWith('/class-records'));
    expect(recordPost?.body).toMatchObject({ students: [{ studentId: null, studentLegacyId: 'missing-student' }] });
    expect(result.status).toBe('success');
  });

  it('blocks records that reference a failed local student', async () => {
    const { calls, fetcher } = createFetchMock({ failStudent: true, finalStudents: [], finalRecords: [] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.records.blocked).toBe(1);
    expect(calls.some((call) => call.method === 'POST' && call.url.endsWith('/class-records'))).toBe(false);
  });

  it('does not silently remove failed student children', async () => {
    const { fetcher } = createFetchMock({ failStudent: true, finalStudents: [], finalRecords: [] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.records.failures[0].reason).toContain('student-1');
  });

  it('marks existing server records without posting them', async () => {
    const { calls, fetcher } = createFetchMock({ existingRecords: [serverRecord], finalRecords: [serverRecord], finalStudents: [serverStudent] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.records.existing).toBe(1);
    expect(calls.some((call) => call.method === 'POST' && call.url.endsWith('/class-records'))).toBe(false);
  });

  it('is idempotent when retried with existing server data', async () => {
    const { calls, fetcher } = createFetchMock({ existingStudents: [serverStudent], existingRecords: [serverRecord], finalStudents: [serverStudent], finalRecords: [serverRecord] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.students.existing).toBe(1);
    expect(result.records.existing).toBe(1);
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0);
  });

  it('reports partial failure accurately', async () => {
    const { fetcher } = createFetchMock({ failRecord: true, finalStudents: [serverStudent], finalRecords: [] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.status).toBe('partial');
    expect(result.students.created).toBe(1);
    expect(result.records.failed).toBeGreaterThan(0);
  });

  it('verifies final legacy IDs', async () => {
    const { fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.verified).toBe(true);
  });

  it('verifies server completion before archive deletion', async () => {
    const { fetcher } = createFetchMock({ existingStudents: [serverStudent], existingRecords: [serverRecord] });

    await expect(verifyLegacyOperationalImportComplete(preview(), { fetcher })).resolves.toEqual({
      ok: true,
      reason: null,
    });
  });

  it('blocks archive deletion verification when a student legacy ID is missing', async () => {
    const { fetcher } = createFetchMock({ existingStudents: [], existingRecords: [serverRecord] });
    const result = await verifyLegacyOperationalImportComplete(preview(), { fetcher });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('student-1');
  });

  it('blocks archive deletion verification when a record legacy ID is missing', async () => {
    const { fetcher } = createFetchMock({ existingStudents: [serverStudent], existingRecords: [] });
    const result = await verifyLegacyOperationalImportComplete(preview(), { fetcher });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('record-1');
  });

  it('blocks archive deletion verification when child data differs', async () => {
    const badRecord = { ...serverRecord, students: [{ ...serverRecord.students[0], skills: ['다른 값'] }] };
    const { fetcher } = createFetchMock({ existingStudents: [serverStudent], existingRecords: [badRecord] });
    const result = await verifyLegacyOperationalImportComplete(preview(), { fetcher });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('record-1');
  });

  it('verifies child connection, snapshot, attendance, focus, skills, and memo', async () => {
    const { fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.status).toBe('success');
  });

  it('returns success only when all candidates are created or existing and verified', async () => {
    const { fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.status).toBe('success');
  });

  it('returns partial when verification fails after some saves', async () => {
    const badRecord = { ...serverRecord, students: [{ ...serverRecord.students[0], memo: '다름' }] };
    const { fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [badRecord] });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.status).toBe('partial');
    expect(result.verified).toBe(false);
  });

  it('separates auth and permission errors from data errors', async () => {
    const { fetcher } = createFetchMock({ forbidden: true });
    const result = await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(result.status).toBe('failed');
    expect(result.students.failures[0].reason).toContain('접근 권한');
  });

  it('does not call localStorage writes', async () => {
    const localStorageMock = { removeItem: vi.fn(), setItem: vi.fn() };
    vi.stubGlobal('localStorage', localStorageMock);
    const { fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });

    await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not touch the Zustand store', async () => {
    const { fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });

    await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(fetcher).toHaveBeenCalled();
  });

  it('does not include ownerId in POST bodies', async () => {
    const { calls, fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });
    await importLegacyOperationalData({ preview: preview(), ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    for (const call of calls.filter((item) => item.method === 'POST')) {
      expect(call.body).not.toHaveProperty('ownerId');
      expect(call.body).not.toHaveProperty('owner_id');
    }
  });

  it('keeps raw backup untouched outside the import helper', async () => {
    const source = preview();
    const raw = source.rawBackup;
    const { fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });

    await importLegacyOperationalData({ preview: source, ownerConfirmed: true, backupConfirmed: true }, { fetcher });

    expect(source.rawBackup).toBe(raw);
  });

  it('emits progress for checking, students, records, and verifying', async () => {
    const progress: OperationalImportProgress[] = [];
    const { fetcher } = createFetchMock({ finalStudents: [serverStudent], finalRecords: [serverRecord] });

    await importLegacyOperationalData(
      { preview: preview(), ownerConfirmed: true, backupConfirmed: true },
      { fetcher, onProgress: (item) => progress.push(item) },
    );

    expect(progress.map((item) => item.stage)).toEqual(['checking', 'students', 'records', 'verifying']);
  });
});
