import { describe, expect, it } from 'vitest';

import {
  buildAdminProgramSaveFailure,
  buildAdminProgramSavePayload,
  resolveAdminBriefingNotes,
  resolveAdminVariationMethod,
} from './adminProgramEditorContract';

describe('admin program editor contract', () => {
  it('prefers Master meta briefing notes', () => {
    expect(resolveAdminBriefingNotes(
      'meta 안내',
      '[사전 교육]\nlegacy 안내',
    )).toBe('meta 안내');
  });

  it('falls back only to the exact briefing section', () => {
    expect(resolveAdminBriefingNotes(
      '  ',
      '[안전 포인트]\n제외\n[사전 교육]\n사용할 안내\n[운영 팁]\n제외',
    )).toBe('사용할 안내');
  });

  it('prefers Master meta variation method', () => {
    expect(resolveAdminVariationMethod(
      'meta 변형',
      '[변형 방법]\nlegacy 변형',
    )).toBe('meta 변형');
  });

  it('falls back only to the exact variation section', () => {
    expect(resolveAdminVariationMethod(
      null,
      '[응용 방법]\n제외\n[변형 방법]\n사용할 변형\n[난이도 낮추기]\n제외',
    )).toBe('사용할 변형');
  });

  it('does not use unlabeled activity_tip as variation method', () => {
    expect(resolveAdminVariationMethod(null, '라벨 없는 과거 내용')).toBe('');
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
      legacyMirrorSaved: false,
      failedStage: 'meta',
      error: 'meta failed',
    })).toEqual({
      ok: false,
      overlaySaved: true,
      metaSaved: false,
      legacyMirrorSaved: false,
      partialSave: true,
      failedStage: 'meta',
      error: 'meta failed',
    });
  });

  it('does not call a pre-write failure a partial save', () => {
    expect(buildAdminProgramSaveFailure({
      overlaySaved: false,
      metaSaved: false,
      legacyMirrorSaved: false,
      failedStage: 'overlay',
      error: 'overlay failed',
    }).partialSave).toBe(false);
  });
});
