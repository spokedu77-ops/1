import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServiceSupabase, requireSpokeduMasterAccess } = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  requireSpokeduMasterAccess: vi.fn(),
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterAccess,
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
}));

import * as classRecordsRoute from './class-records/route';
import * as deleteStudentRoute from './students/[id]/route';
import * as studentsRoute from './students/route';

type QueryCall = {
  table: string;
  action: string;
  args: unknown[];
};

type StudentRow = {
  id: string;
  owner_id: string;
  legacy_id: string | null;
  name: string;
  group_name: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ClassRecordRow = {
  id: string;
  owner_id: string;
  legacy_id: string | null;
  class_date: string;
  lesson_title: string | null;
  class_id: string | null;
  program_id: number | null;
  program_title: string | null;
  record_type: 'quick' | 'detailed';
  memo: string | null;
  parent_note_snapshot: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  spokedu_master_class_record_students: unknown[];
};

function studentRow(overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    id: 'student-1',
    owner_id: 'owner-1',
    legacy_id: 'legacy-student-1',
    name: 'Student 1',
    group_name: 'A',
    meta: {},
    created_at: '2026-06-20T00:00:00.000Z',
    updated_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function classRecordRow(overrides: Partial<ClassRecordRow> = {}): ClassRecordRow {
  return {
    id: 'record-1',
    owner_id: 'owner-1',
    legacy_id: 'legacy-record-1',
    class_date: '2026-06-20',
    lesson_title: 'Lesson 1',
    class_id: 'A',
    program_id: 52,
    program_title: 'Program 52',
    record_type: 'detailed',
    memo: null,
    parent_note_snapshot: null,
    created_at: '2026-06-20T00:00:00.000Z',
    updated_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    spokedu_master_class_record_students: [],
    ...overrides,
  };
}

function allowAccess(userId = 'owner-1') {
  requireSpokeduMasterAccess.mockResolvedValue({
    ok: true,
    userId,
    isAdmin: false,
    plan: 'pro',
  });
}

function denyAccess(status: number) {
  requireSpokeduMasterAccess.mockResolvedValue({
    ok: false,
    response: Response.json({ error: status === 401 ? 'Unauthorized' : 'Denied' }, { status }),
  });
}

function createSupabaseMock(options: {
  studentsGetData?: StudentRow[];
  studentExisting?: StudentRow | null;
  studentInsertData?: StudentRow;
  studentDeleteExisting?: Pick<StudentRow, 'id'> | null;
  recordsGetData?: ClassRecordRow[];
  existingRecord?: ClassRecordRow | null;
  ownedStudentIds?: string[];
  createRpcData?: Array<{ record_id: string; created: boolean }> | null;
  createRpcError?: { code: string; message: string } | null;
  rpcError?: { code: string; message: string } | null;
} = {}) {
  const calls: QueryCall[] = [];

  const supabase = {
    rpc: vi.fn((name: string, args: Record<string, unknown>) => {
      calls.push({ table: name, action: 'rpc', args: [args] });
      if (name === 'spokedu_master_create_class_record') {
        return Promise.resolve({
          data: options.createRpcData ?? [{ record_id: 'record-created', created: true }],
          error: options.createRpcError ?? null,
        });
      }
      const missingRecord =
        Object.prototype.hasOwnProperty.call(options, 'existingRecord') &&
        options.existingRecord === null;
      return Promise.resolve({
        data: missingRecord ? null : String(args.p_record_id),
        error: options.rpcError ?? (
          missingRecord ? { code: 'P0002', message: 'class record not found' } : null
        ),
      });
    }),
    from: vi.fn((table: string) => {
      const state = {
        table,
        mode: 'select' as 'select' | 'insert' | 'update' | 'delete',
        orderCount: 0,
        eqCount: 0,
      };

      const builder = {
        select: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'select', args });
          state.mode = 'select';
          return builder;
        }),
        eq: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'eq', args });
          state.eqCount += 1;
          if (state.mode === 'update' && state.eqCount >= 2) {
            return Promise.resolve({ error: null });
          }
          if (state.mode === 'delete' && state.eqCount >= 2) {
            return Promise.resolve({ error: null });
          }
          return builder;
        }),
        is: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'is', args });
          return builder;
        }),
        order: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'order', args });
          state.orderCount += 1;
          if (state.orderCount >= 2 && table === 'spokedu_master_students') {
            return Promise.resolve({ data: options.studentsGetData ?? [], error: null });
          }
          if (state.orderCount >= 2 && table === 'spokedu_master_class_records') {
            return Promise.resolve({ data: options.recordsGetData ?? [], error: null });
          }
          return builder;
        }),
        in: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'in', args });
          return Promise.resolve({
            data: (options.ownedStudentIds ?? []).map((id) => ({ id })),
            error: null,
          });
        }),
        insert: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'insert', args });
          state.mode = 'insert';
          return builder;
        }),
        update: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'update', args });
          state.mode = 'update';
          state.eqCount = 0;
          return builder;
        }),
        delete: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'delete', args });
          state.mode = 'delete';
          state.eqCount = 0;
          return builder;
        }),
        maybeSingle: vi.fn(() => {
          if (table === 'spokedu_master_students' && state.mode === 'select') {
            return Promise.resolve({
              data: options.studentDeleteExisting ?? options.studentExisting ?? null,
              error: null,
            });
          }
          if (table === 'spokedu_master_class_records' && state.mode === 'select') {
            return Promise.resolve({ data: options.existingRecord ?? null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        single: vi.fn(() => {
          if (table === 'spokedu_master_students') {
            return Promise.resolve({
              data: options.studentInsertData ?? studentRow({ id: 'student-created' }),
              error: null,
            });
          }
          if (table === 'spokedu_master_class_records') {
            return Promise.resolve({ data: { id: 'record-created' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };

      return builder;
    }),
  };

  getServiceSupabase.mockReturnValue(supabase);
  return { calls };
}

function studentRequest(body: unknown) {
  return new Request('http://local/api/spokedu-master/students', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function classRecordRequest(body: unknown) {
  return new Request('http://local/api/spokedu-master/class-records', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('SPOKEDU MASTER operational routes ownership contract', () => {
  beforeEach(() => {
    getServiceSupabase.mockReset();
    requireSpokeduMasterAccess.mockReset();
  });

  it.each([
    ['students GET', () => studentsRoute.GET()],
    ['students POST', () => studentsRoute.POST(studentRequest({}))],
    [
      'students DELETE',
      () => deleteStudentRoute.DELETE(new Request('http://local'), { params: Promise.resolve({ id: 'student-1' }) }),
    ],
    ['class-records GET', () => classRecordsRoute.GET()],
    ['class-records POST', () => classRecordsRoute.POST(classRecordRequest({}))],
  ])('blocks unauthenticated %s', async (_label, invoke) => {
    denyAccess(401);

    const response = await invoke();

    expect(response.status).toBe(401);
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it.each([
    ['students GET', () => studentsRoute.GET()],
    ['class-records GET', () => classRecordsRoute.GET()],
  ])('keeps the existing 403 policy for %s without querying data', async (_label, invoke) => {
    denyAccess(403);

    const response = await invoke();

    expect(response.status).toBe(403);
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it('returns only the current owner students from the database query', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({
      studentsGetData: [studentRow({ id: 'student-a', owner_id: 'owner-a' })],
    });

    const response = await studentsRoute.GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 'student-a' }],
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_students',
      action: 'eq',
      args: ['owner_id', 'owner-a'],
    });
  });

  it('uses the authenticated owner when creating a student', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock();

    const response = await studentsRoute.POST(studentRequest({
      ownerId: 'owner-b',
      name: 'Student A',
      group: 'QA',
      meta: {},
    }));

    expect(response.status).toBe(201);
    expect(calls).toContainEqual({
      table: 'spokedu_master_students',
      action: 'insert',
      args: [
        {
          owner_id: 'owner-a',
          legacy_id: null,
          name: 'Student A',
          group_name: 'QA',
          meta: {},
        },
      ],
    });
  });

  it('does not delete another owner student id', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({ studentDeleteExisting: null });

    const response = await deleteStudentRoute.DELETE(new Request('http://local'), {
      params: Promise.resolve({ id: 'student-b' }),
    });

    expect(response.status).toBe(404);
    expect(calls).toContainEqual({
      table: 'spokedu_master_students',
      action: 'eq',
      args: ['owner_id', 'owner-a'],
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_students',
      action: 'eq',
      args: ['id', 'student-b'],
    });
    expect(calls).not.toContainEqual(expect.objectContaining({ action: 'update' }));
  });

  it('soft deletes only a current owner student', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({ studentDeleteExisting: { id: 'student-a' } });

    const response = await deleteStudentRoute.DELETE(new Request('http://local'), {
      params: Promise.resolve({ id: 'student-a' }),
    });

    expect(response.status).toBe(200);
    expect(calls).toContainEqual({
      table: 'spokedu_master_students',
      action: 'update',
      args: [expect.objectContaining({ deleted_at: expect.any(String) })],
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_students',
      action: 'eq',
      args: ['owner_id', 'owner-a'],
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_students',
      action: 'eq',
      args: ['id', 'student-a'],
    });
  });

  it('returns only the current owner class records from the database query', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({
      recordsGetData: [classRecordRow({ id: 'record-a', owner_id: 'owner-a' })],
    });

    const response = await classRecordsRoute.GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 'record-a' }],
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_class_records',
      action: 'eq',
      args: ['owner_id', 'owner-a'],
    });
  });

  it('creates a class record with one RPC transaction and reloads the DTO', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({
      existingRecord: classRecordRow({
        id: 'record-created',
        owner_id: 'owner-a',
        spokedu_master_class_record_students: [
          {
            id: 'child-1',
            owner_id: 'owner-a',
            record_id: 'record-created',
            student_id: '11111111-1111-4111-8111-111111111111',
            student_legacy_id: 'legacy-a',
            student_name_snapshot: 'Student A',
            attendance: 'present',
            focused: true,
            skills: ['balance'],
            memo: 'Good',
            created_at: '2026-06-20T00:00:00.000Z',
            updated_at: '2026-06-20T00:00:00.000Z',
          },
        ],
      }),
    });

    const response = await classRecordsRoute.POST(classRecordRequest({
      legacyId: 'client-request-1',
      date: '2026-06-20',
      lessonTitle: 'Lesson',
      classId: 'A',
      programId: 52,
      programTitle: 'Program 52',
      recordType: 'detailed',
      students: [
        {
          studentId: '11111111-1111-4111-8111-111111111111',
          studentLegacyId: 'legacy-a',
          studentName: 'Student A',
          attendance: 'present',
          focused: true,
          skills: ['balance'],
          memo: 'Good',
        },
      ],
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      duplicate: false,
      data: {
        id: 'record-created',
        students: [{ studentId: '11111111-1111-4111-8111-111111111111' }],
      },
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_create_class_record',
      action: 'rpc',
      args: [
        expect.objectContaining({
          p_owner_id: 'owner-a',
          p_legacy_id: 'client-request-1',
          p_students: [
            expect.objectContaining({
              student_id: '11111111-1111-4111-8111-111111111111',
              attendance: 'present',
            }),
          ],
        }),
      ],
    });
    expect(calls).not.toContainEqual({
      table: 'spokedu_master_class_records',
      action: 'insert',
      args: expect.any(Array),
    });
    expect(calls).not.toContainEqual({
      table: 'spokedu_master_class_record_students',
      action: 'insert',
      args: expect.any(Array),
    });
    expect(calls).not.toContainEqual(expect.objectContaining({ action: 'delete' }));
  });

  it('returns one existing class record on idempotent create retry', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({
      createRpcData: [{ record_id: 'record-created', created: false }],
      existingRecord: classRecordRow({ id: 'record-created', owner_id: 'owner-a' }),
    });

    const response = await classRecordsRoute.POST(classRecordRequest({
      legacyId: 'client-request-1',
      date: '2026-06-20',
      recordType: 'detailed',
      students: [],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      duplicate: true,
      data: { id: 'record-created' },
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_create_class_record',
      action: 'rpc',
      args: [expect.objectContaining({ p_legacy_id: 'client-request-1' })],
    });
  });

  it('blocks a class record that references another owner studentId', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({
      createRpcError: { code: '22023', message: 'student is not available for this owner' },
    });

    const response = await classRecordsRoute.POST(classRecordRequest({
      date: '2026-06-20',
      recordType: 'detailed',
      students: [
        {
          studentId: 'student-b',
          studentLegacyId: 'legacy-b',
          studentName: 'Student B',
          attendance: 'present',
          focused: true,
          skills: ['협응력'],
          memo: 'Other owner',
        },
      ],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'studentId is not available for this owner' });
    expect(calls).toContainEqual({
      table: 'spokedu_master_create_class_record',
      action: 'rpc',
      args: [expect.objectContaining({ p_owner_id: 'owner-a' })],
    });
    expect(calls).not.toContainEqual({
      table: 'spokedu_master_class_records',
      action: 'insert',
      args: expect.any(Array),
    });
  });

  it('updates a current owner class record and replaces child rows without creating a new parent record', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({
      existingRecord: classRecordRow({
        id: 'record-a',
        owner_id: 'owner-a',
        memo: 'Updated memo',
        spokedu_master_class_record_students: [
          {
            id: 'record-a-student-1',
            owner_id: 'owner-a',
            record_id: 'record-a',
            student_id: 'student-a',
            student_legacy_id: 'legacy-a',
            student_name_snapshot: 'Student A',
            attendance: 'absent',
            focused: true,
            skills: ['balance'],
            memo: 'Updated student memo',
            created_at: '2026-06-20T00:00:00.000Z',
            updated_at: '2026-06-20T00:00:00.000Z',
          },
        ],
      }),
      ownedStudentIds: ['student-a'],
    });

    const response = await classRecordsRoute.PATCH(
      new Request('http://local/api/spokedu-master/class-records?id=record-a', {
        method: 'PATCH',
        body: JSON.stringify({
          legacyId: 'client-legacy-should-not-update',
          date: '2026-06-21',
          lessonTitle: 'Updated lesson',
          classId: 'Updated class',
          programId: 52,
          programTitle: 'Program 52',
          recordType: 'detailed',
          memo: 'Updated memo',
          parentNoteSnapshot: null,
          students: [
            {
              studentId: 'student-a',
              studentLegacyId: 'legacy-a',
              studentName: 'Student A',
              attendance: 'absent',
              focused: true,
              skills: ['balance'],
              memo: 'Updated student memo',
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: 'record-a',
        memo: 'Updated memo',
        students: [
          {
            studentId: 'student-a',
            attendance: 'absent',
            focused: true,
            skills: ['balance'],
            memo: 'Updated student memo',
          },
        ],
      },
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_replace_class_record',
      action: 'rpc',
      args: [
        expect.objectContaining({
          p_owner_id: 'owner-a',
          p_record_id: 'record-a',
          p_class_date: '2026-06-21',
          p_class_id: 'Updated class',
          p_memo: 'Updated memo',
          p_students: [
            expect.objectContaining({
              student_id: 'student-a',
              attendance: 'absent',
              memo: 'Updated student memo',
            }),
          ],
        }),
      ],
    });
    expect(calls).not.toContainEqual({
      table: 'spokedu_master_class_records',
      action: 'insert',
      args: expect.any(Array),
    });
  });

  it('does not update another owner class record id', async () => {
    allowAccess('owner-a');
    const { calls } = createSupabaseMock({ existingRecord: null });

    const response = await classRecordsRoute.PATCH(
      classRecordRequest({
        date: '2026-06-21',
        recordType: 'detailed',
        students: [],
      }),
    );

    expect(response.status).toBe(400);

    const responseWithId = await classRecordsRoute.PATCH(
      new Request('http://local/api/spokedu-master/class-records?id=record-b', {
        method: 'PATCH',
        body: JSON.stringify({
          date: '2026-06-21',
          recordType: 'detailed',
          students: [],
        }),
      }),
    );

    expect(responseWithId.status).toBe(404);
    expect(calls).toContainEqual({
      table: 'spokedu_master_replace_class_record',
      action: 'rpc',
      args: [expect.objectContaining({
        p_owner_id: 'owner-a',
        p_record_id: 'record-b',
      })],
    });
    expect(calls).not.toContainEqual(expect.objectContaining({ action: 'update' }));
  });
});
