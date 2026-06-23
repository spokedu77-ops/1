import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServiceSupabase, requireSpokeduMasterAccess } = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  requireSpokeduMasterAccess: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterAccess,
}));

import { GET, POST } from './route';

type QueryResult<T> = {
  count?: number | null;
  data: T | null;
  error: { message: string } | null;
};

type QueryCall = {
  table: string;
  action: string;
  args: unknown[];
};

type ExplanationRow = {
  id: string;
  owner_id: string;
  program_id: string;
  program_title: string;
  audience: 'parent' | 'center' | 'school';
  explanation_text: string;
  created_at: string;
};

function explanationRow(overrides: Partial<ExplanationRow> = {}): ExplanationRow {
  return {
    id: 'explanation-1',
    owner_id: 'owner-1',
    program_id: '52',
    program_title: 'Band Lesson',
    audience: 'parent',
    explanation_text: 'Saved explanation',
    created_at: '2026-06-19T10:00:00.000Z',
    ...overrides,
  };
}

function allowAccess() {
  requireSpokeduMasterAccess.mockResolvedValue({
    ok: true,
    userId: 'owner-1',
    isAdmin: false,
    plan: 'pro',
  });
}

function denyAccess(status: number) {
  requireSpokeduMasterAccess.mockResolvedValue({
    ok: false,
    response: Response.json({ error: 'Denied' }, { status }),
  });
}

function requestJson(body: unknown) {
  return new Request('http://local/api/spokedu-master/explanations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function createSupabaseMock(options: {
  getResult?: QueryResult<ExplanationRow[]>;
  insertResult?: QueryResult<{ id: string }>;
  reloadResult?: QueryResult<ExplanationRow>;
} = {}) {
  const calls: QueryCall[] = [];
  const getResult = options.getResult ?? {
    count: 1,
    data: [explanationRow()],
    error: null,
  };
  const insertResult = options.insertResult ?? {
    data: { id: 'explanation-1' },
    error: null,
  };
  const reloadResult = options.reloadResult ?? {
    data: explanationRow(),
    error: null,
  };

  const supabase = {
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'select', args });
          return builder;
        }),
        eq: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'eq', args });
          return builder;
        }),
        order: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'order', args });
          return builder;
        }),
        limit: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'limit', args });
          return Promise.resolve(getResult);
        }),
        insert: vi.fn((...args: unknown[]) => {
          calls.push({ table, action: 'insert', args });
          return builder;
        }),
        single: vi.fn(() => Promise.resolve(insertResult)),
        maybeSingle: vi.fn(() => Promise.resolve(reloadResult)),
      };

      return builder;
    }),
  };

  getServiceSupabase.mockReturnValue(supabase);
  return { calls, supabase };
}

describe('SPOKEDU MASTER explanations route', () => {
  beforeEach(() => {
    getServiceSupabase.mockReset();
    requireSpokeduMasterAccess.mockReset();
  });

  it('blocks unauthenticated GET', async () => {
    denyAccess(401);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it('blocks GET without access', async () => {
    denyAccess(403);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it('filters GET by access.userId', async () => {
    allowAccess();
    const { calls } = createSupabaseMock();

    await GET();

    expect(calls).toContainEqual({
      table: 'spokedu_master_explanations',
      action: 'select',
      args: [expect.any(String), { count: 'exact' }],
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_explanations',
      action: 'eq',
      args: ['owner_id', 'owner-1'],
    });
  });

  it('orders GET by created_at descending', async () => {
    allowAccess();
    const { calls } = createSupabaseMock();

    await GET();

    expect(calls).toContainEqual({
      table: 'spokedu_master_explanations',
      action: 'order',
      args: ['created_at', { ascending: false }],
    });
  });

  it('limits GET to 10 rows', async () => {
    allowAccess();
    const { calls } = createSupabaseMock();

    await GET();

    expect(calls).toContainEqual({
      table: 'spokedu_master_explanations',
      action: 'limit',
      args: [10],
    });
  });

  it('maps GET rows to DTOs', async () => {
    allowAccess();
    createSupabaseMock({
      getResult: {
        count: 12,
        data: [
          explanationRow({
            id: 'explanation-2',
            program_id: '99',
            program_title: 'Program 99',
            audience: 'school',
            explanation_text: 'School note',
            created_at: '2026-06-19T12:00:00.000Z',
          }),
        ],
        error: null,
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'explanation-2',
          programId: '99',
          programTitle: 'Program 99',
          audience: 'school',
          text: 'School note',
          createdAt: '2026-06-19T12:00:00.000Z',
        },
      ],
      total: 12,
    });
  });

  it('returns total explanation count for GET', async () => {
    allowAccess();
    createSupabaseMock({
      getResult: {
        count: 42,
        data: [explanationRow()],
        error: null,
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ total: 42 });
  });

  it('loads a saved explanation by id within the current owner scope', async () => {
    allowAccess();
    const { calls } = createSupabaseMock({
      reloadResult: {
        data: explanationRow({ id: 'saved-old-1', explanation_text: 'Older saved explanation' }),
        error: null,
      },
    });

    const response = await GET(new Request('http://local/api/spokedu-master/explanations?saved=saved-old-1'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 'saved-old-1', text: 'Older saved explanation' }],
      total: 1,
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_explanations',
      action: 'eq',
      args: ['owner_id', 'owner-1'],
    });
    expect(calls).toContainEqual({
      table: 'spokedu_master_explanations',
      action: 'eq',
      args: ['id', 'saved-old-1'],
    });
    expect(calls).not.toContainEqual({
      table: 'spokedu_master_explanations',
      action: 'limit',
      args: [10],
    });
  });

  it('returns an empty saved explanation result without leaking other owners', async () => {
    allowAccess();
    createSupabaseMock({
      reloadResult: {
        data: null,
        error: null,
      },
    });

    const response = await GET(new Request('http://local/api/spokedu-master/explanations?saved=missing'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [], total: 0 });
  });

  it('creates a valid explanation with status 201', async () => {
    allowAccess();
    createSupabaseMock();

    const response = await POST(requestJson({
      programId: ' 52 ',
      programTitle: ' Band Lesson ',
      audience: 'parent',
      text: ' Saved explanation ',
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 'explanation-1',
        programId: '52',
        programTitle: 'Band Lesson',
        audience: 'parent',
        text: 'Saved explanation',
        createdAt: '2026-06-19T10:00:00.000Z',
      },
    });
  });

  it('uses access.userId instead of request ownerId for POST', async () => {
    allowAccess();
    const { calls } = createSupabaseMock();

    await POST(requestJson({
      ownerId: 'other-owner',
      programId: '52',
      programTitle: 'Band Lesson',
      audience: 'center',
      text: 'Saved explanation',
    }));

    expect(calls).toContainEqual({
      table: 'spokedu_master_explanations',
      action: 'insert',
      args: [
        {
          owner_id: 'owner-1',
          program_id: '52',
          program_title: 'Band Lesson',
          audience: 'center',
          explanation_text: 'Saved explanation',
        },
      ],
    });
  });

  it.each([
    ['programId', { programId: ' ', programTitle: 'Title', audience: 'parent', text: 'Text' }],
    ['programTitle', { programId: '52', programTitle: '', audience: 'parent', text: 'Text' }],
    ['audience', { programId: '52', programTitle: 'Title', audience: 'teacher', text: 'Text' }],
    ['text', { programId: '52', programTitle: 'Title', audience: 'parent', text: ' ' }],
  ])('rejects invalid POST %s', async (_field, body) => {
    allowAccess();

    const response = await POST(requestJson(body));

    expect(response.status).toBe(400);
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it('returns 500 for GET database errors', async () => {
    allowAccess();
    createSupabaseMock({
      getResult: { data: null, error: { message: 'GET failed' } },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'GET failed' });
  });

  it('returns 500 for POST database errors', async () => {
    allowAccess();
    createSupabaseMock({
      insertResult: { data: null, error: { message: 'INSERT failed' } },
    });

    const response = await POST(requestJson({
      programId: '52',
      programTitle: 'Band Lesson',
      audience: 'parent',
      text: 'Saved explanation',
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'INSERT failed' });
  });

  it.each([
    ['GET', () => GET()],
    ['POST', () => POST(requestJson({
      programId: '52',
      programTitle: 'Band Lesson',
      audience: 'parent',
      text: 'Saved explanation',
    }))],
  ])('uses private no-store headers for %s', async (_method, invoke) => {
    allowAccess();
    createSupabaseMock();

    const response = await invoke();

    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Vary')).toBe('Cookie, Authorization');
  });
});
