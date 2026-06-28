import { beforeEach, describe, expect, it, vi } from 'vitest';

const reportError = vi.fn();
const getServiceSupabase = vi.fn();

vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  reportError,
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
  requireAdmin: vi.fn(),
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterAccess: vi.fn(async () => ({ ok: true, userId: 'user-1' })),
}));

type QueryResult = {
  data: unknown;
  error: unknown;
};

function createQueryResult(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(resolve(result)),
  };
  return query;
}

function mockProgramQueries(results: Record<string, QueryResult>) {
  getServiceSupabase.mockReturnValue({
    from: vi.fn((table: string) => createQueryResult(results[table] ?? { data: [], error: null })),
  });
}

function validMeta(overrides: Record<string, unknown> = {}) {
  return {
    curriculum_id: 101,
    sm_tags: [],
    sm_theme: 'movement',
    sm_grade: 'ALL',
    sm_space: 'ALL',
    sm_duration: 10,
    sm_is_pro: false,
    sm_is_new: false,
    sm_is_hot: false,
    sm_display_order: 1,
    sm_colors: null,
    sm_objective: null,
    sm_development_focus: null,
    sm_coach_script: null,
    sm_parent_note: null,
    sm_related_spomove_ids: ['missing-spomove-id'],
    sm_thumbnail_url: 'not-a-url',
    sm_hero_image_url: 'https://example.com/hero.jpg',
    sm_setup_image_url: null,
    sm_gallery_image_urls: ['bad-url', 'https://example.com/gallery.jpg'],
    sm_briefing_notes: null,
    sm_variation_method: null,
    ...overrides,
  };
}

function validOverlay(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Balance Game',
    source_center_curriculum_id: 101,
    video_url: 'not-a-video-url',
    activity_method: 'Step one\nStep one\nStep two',
    equipment: null,
    updated_at: '2026-06-26T00:00:00.000Z',
    is_published: true,
    ...overrides,
  };
}

async function getPrograms() {
  const route = await import('./route');
  const response = await route.GET();
  return {
    status: response.status,
    body: await response.json(),
  };
}

describe('SPOKEDU MASTER program GET validation', () => {
  beforeEach(() => {
    vi.resetModules();
    reportError.mockReset();
    getServiceSupabase.mockReset();
  });

  it.each([
    ['curriculum', 'curriculum'],
    ['meta', 'spokedu_master_program_meta'],
    ['overlay', 'spokedu_pro_programs'],
  ])('returns 500 when %s lookup fails', async (_, failingTable) => {
    mockProgramQueries({
      curriculum: {
        data: failingTable === 'curriculum' ? null : [{ id: 101, display_order: 1 }],
        error: failingTable === 'curriculum' ? new Error('raw curriculum db failure') : null,
      },
      spokedu_master_program_meta: {
        data: failingTable === 'spokedu_master_program_meta' ? null : [validMeta()],
        error: failingTable === 'spokedu_master_program_meta' ? new Error('raw meta db failure') : null,
      },
      spokedu_pro_programs: {
        data: failingTable === 'spokedu_pro_programs' ? null : [validOverlay()],
        error: failingTable === 'spokedu_pro_programs' ? new Error('raw overlay db failure') : null,
      },
    });

    const result = await getPrograms();

    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      error: '수업 자료를 불러오지 못했습니다.',
      code: 'PROGRAM_SOURCE_FAILED',
    });
    expect(JSON.stringify(result.body)).not.toContain('raw');
    expect(reportError).toHaveBeenCalled();
  });

  it.each([
    ['missing overlay', [], 200],
    ['unpublished overlay', [validOverlay({ is_published: false })], 200],
    ['null publication overlay', [validOverlay({ is_published: null })], 200],
    ['wrong curriculum overlay', [validOverlay({ source_center_curriculum_id: 999 })], 200],
  ])('does not expose %s as a normal program', async (_, overlays, expectedStatus) => {
    mockProgramQueries({
      curriculum: { data: [{ id: 101, display_order: 1 }], error: null },
      spokedu_master_program_meta: { data: [validMeta()], error: null },
      spokedu_pro_programs: { data: overlays, error: null },
    });

    const result = await getPrograms();

    expect(result.status).toBe(expectedStatus);
    expect(result.body).toEqual({ data: [], total: 0 });
  });

  it.each([
    ['blank title', validMeta(), validOverlay({ title: '   ' })],
    ['broken title', validMeta(), validOverlay({ title: String.fromCharCode(0xfffd) })],
    ['missing category', validMeta({ sm_theme: '' }), validOverlay()],
    ['broken category', validMeta({ sm_theme: String.fromCharCode(0xfffd) }), validOverlay()],
    ['missing grade', validMeta({ sm_grade: '' }), validOverlay()],
    ['missing space', validMeta({ sm_space: '' }), validOverlay()],
    ['zero duration', validMeta({ sm_duration: 0 }), validOverlay()],
    ['negative duration', validMeta({ sm_duration: -1 }), validOverlay()],
    ['NaN duration', validMeta({ sm_duration: Number.NaN }), validOverlay()],
    ['missing steps', validMeta(), validOverlay({ activity_method: '   ' })],
  ])('returns an error when all published programs are invalid: %s', async (_, meta, overlay) => {
    mockProgramQueries({
      curriculum: { data: [{ id: 101, display_order: 1 }], error: null },
      spokedu_master_program_meta: { data: [meta], error: null },
      spokedu_pro_programs: { data: [overlay], error: null },
    });

    const result = await getPrograms();

    expect(result.status).toBe(500);
    expect(result.body.code).toBe('PROGRAM_SOURCE_FAILED');
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      context: 'spokedu-master.programs.validation',
      tags: expect.objectContaining({ invalidCount: 1 }),
    }));
  });

  it('keeps valid programs while excluding invalid rows and keeps total in sync', async () => {
    mockProgramQueries({
      curriculum: {
        data: [
          { id: 101, display_order: 2 },
          { id: 202, display_order: 1 },
        ],
        error: null,
      },
      spokedu_master_program_meta: {
        data: [
          validMeta({ curriculum_id: 101, sm_display_order: 20 }),
          validMeta({ curriculum_id: 202, sm_display_order: 10, sm_duration: 0 }),
        ],
        error: null,
      },
      spokedu_pro_programs: {
        data: [
          validOverlay({ source_center_curriculum_id: 101, updated_at: '2026-06-25T00:00:00.000Z', title: 'Old title' }),
          validOverlay({ source_center_curriculum_id: 101, updated_at: '2026-06-26T00:00:00.000Z', title: 'Newest title' }),
          validOverlay({ source_center_curriculum_id: 202, title: 'Invalid duration' }),
        ],
        error: null,
      },
    });

    const result = await getPrograms();

    expect(result.status).toBe(200);
    expect(result.body.total).toBe(1);
    expect(result.body.data).toHaveLength(1);
    expect(result.body.data[0]).toEqual(expect.objectContaining({
      id: '101',
      title: 'Newest title',
      duration: 10,
      homeSortOrder: 20,
    }));
    expect(result.body.data[0].steps).toEqual(['Step one', 'Step two']);
    expect(result.body.data[0].lessonDetail.relatedSpomoveIds).toEqual([]);
    expect(result.body.data[0].lessonDetail.galleryImageUrls).toEqual(['https://example.com/gallery.jpg']);
    expect(result.body.data[0].thumbnailUrl).toBe('https://example.com/hero.jpg');
  });

  it('preserves explicit safety, field, setup, and variation sections from Master meta', async () => {
    mockProgramQueries({
      curriculum: { data: [{ id: 101, display_order: 1 }], error: null },
      spokedu_master_program_meta: {
        data: [validMeta({
          sm_briefing_notes: [
            '[사전 교육]',
            'Brief before class',
            '[안전 포인트]',
            'Keep lanes separated',
            '[운영 팁]',
            'Run one team at a time',
            '[세팅]',
            'Place cones in two lanes',
          ].join('\n'),
          sm_variation_method: '[변형 방법]\nShorten the lane\nUse walking only',
        })],
        error: null,
      },
      spokedu_pro_programs: {
        data: [validOverlay({ equipment: 'cones', video_url: 'https://youtu.be/dQw4w9WgXcQ' })],
        error: null,
      },
    });

    const result = await getPrograms();
    const detail = result.body.data[0].lessonDetail;

    expect(result.status).toBe(200);
    expect(detail.briefingNotes).toContain('Brief before class');
    expect(detail.safetyNotes).toEqual(['Keep lanes separated']);
    expect(detail.fieldTips).toEqual(['Run one team at a time']);
    expect(detail.setupNotes).toEqual(['Place cones in two lanes']);
    expect(detail.variations).toEqual(['Shorten the lane', 'Use walking only']);
  });

  it('does not invent safety or field notes when source metadata has none', async () => {
    mockProgramQueries({
      curriculum: { data: [{ id: 101, display_order: 1 }], error: null },
      spokedu_master_program_meta: { data: [validMeta({ sm_briefing_notes: 'Brief only' })], error: null },
      spokedu_pro_programs: { data: [validOverlay({ equipment: 'cones' })], error: null },
    });

    const result = await getPrograms();
    const detail = result.body.data[0].lessonDetail;

    expect(detail.safetyNotes).toEqual([]);
    expect(detail.fieldTips).toEqual([]);
    expect(detail.setupNotes).toEqual([]);
  });

  it('returns the existing empty-data contract when there are no published overlays', async () => {
    mockProgramQueries({
      curriculum: { data: [{ id: 101, display_order: 1 }], error: null },
      spokedu_master_program_meta: { data: [validMeta()], error: null },
      spokedu_pro_programs: { data: [], error: null },
    });

    const result = await getPrograms();

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ data: [], total: 0 });
  });
});
