import { describe, expect, it } from 'vitest';

import {
  buildAdminProgramSaveFailure,
  buildAdminProgramSavePayload,
  buildAdminProgramSaveSuccess,
  replaceAdminProgramByCurriculumId,
  resolveAdminBriefingNotes,
  resolveAdminVariationMethod,
} from './adminProgramEditorContract';

describe('admin program editor contract', () => {
  it('prefers Master meta briefing notes', () => {
    expect(resolveAdminBriefingNotes('meta 안내')).toBe('meta 안내');
  });

  it('does not fall back to legacy briefing content', () => {
    expect(resolveAdminBriefingNotes('  ')).toBe('');
  });

  it('prefers Master meta variation method', () => {
    expect(resolveAdminVariationMethod('meta 변형')).toBe('meta 변형');
  });

  it('does not fall back to legacy variation content', () => {
    expect(resolveAdminVariationMethod(null)).toBe('');
  });

  it('builds only the final Master meta and overlay payload fields', () => {
    const payload = buildAdminProgramSavePayload({
      title: ' 제목 ',
      fallbackTitle: 'fallback',
      videoUrl: ' https://example.com/video ',
      equipment: ' 공 1개 \n\n 원마커 ',
      activityMethod: ' 1단계 \n 2단계 ',
      publicationStatus: 'ready',
      theme: ' 협동 ',
      target: ' 미취학 ',
      tags: [' 움직임:동적 ', '신체 기능:민첩성', '움직임:동적'],
      space: ' 교실 ',
      duration: 15,
      setupImageUrl: ' /setup.jpg ',
      coachScript: ' 시작합니다. ',
      briefingNotes: ' 안내 1 \n 안내 2 ',
      variationMethod: ' 변형 1 ',
    });

    expect(Object.keys(payload.meta)).toEqual([
      'sm_theme',
      'sm_grade',
      'sm_tags',
      'sm_space',
      'sm_duration',
      'sm_setup_image_url',
      'sm_coach_script',
      'sm_briefing_notes',
      'sm_variation_method',
    ]);
    expect(Object.keys(payload.overlay)).toEqual([
      'title',
      'video_url',
      'equipment',
      'activity_method',
      'is_published',
    ]);
    expect(payload.meta.sm_tags).toEqual(['움직임:동적', '신체 기능:민첩성']);
    expect(payload.overlay).not.toHaveProperty('main_theme');
    expect(payload.overlay).not.toHaveProperty('group_size');
    expect(payload.overlay).not.toHaveProperty('function_types');
    expect(payload.overlay).not.toHaveProperty('activity_tip');
    expect(payload.overlay).not.toHaveProperty('checklist');
  });

  it('reports a partial save after a later stage fails', () => {
    expect(buildAdminProgramSaveFailure({
      overlaySaved: true,
      metaSaved: false,
      failedStage: 'meta',
      error: 'meta failed',
    })).toEqual({
      ok: false,
      overlaySaved: true,
      metaSaved: false,
      partialSave: true,
      failedStage: 'meta',
      error: 'meta failed',
    });
  });

  it('does not call a pre-write failure a partial save', () => {
    expect(buildAdminProgramSaveFailure({
      overlaySaved: false,
      metaSaved: false,
      failedStage: 'overlay',
      error: 'overlay failed',
    }).partialSave).toBe(false);
  });

  it('marks a single-program reload failure with the reload stage', () => {
    expect(buildAdminProgramSaveFailure({
      overlaySaved: true,
      metaSaved: true,
      failedStage: 'reload',
      error: 'single reload failed',
    })).toMatchObject({
      ok: false,
      partialSave: true,
      failedStage: 'reload',
    });
  });

  it('returns one saved program without a programs array', () => {
    const response = buildAdminProgramSaveSuccess({
      curriculumId: 52,
      overlay: { id: 39 },
      meta: { curriculum_id: 52 },
    });
    expect(response.program.curriculumId).toBe(52);
    expect(response).not.toHaveProperty('data');
    expect(response).not.toHaveProperty('programs');
  });

  it('replaces only the matching curriculum row', () => {
    const original = [
      { curriculum: { id: 51 }, title: 'A' },
      { curriculum: { id: 52 }, title: 'B' },
      { curriculum: { id: 53 }, title: 'C' },
    ];
    const replacement = { curriculum: { id: 52 }, title: 'updated' };
    const result = replaceAdminProgramByCurriculumId(
      original,
      52,
      replacement,
      (item) => item.curriculum.id,
    );
    expect(result).toEqual([original[0], replacement, original[2]]);
  });
});
