import { describe, expect, it } from 'vitest';

import type { LessonDisplayModel } from './lessonDisplayModel';
import {
  buildLessonPlanSections,
  formatLessonPlanText,
  LESSON_PLAN_SECTION_LABEL,
  LESSON_PLAN_SECTION_ORDER,
} from './lessonPlanExport';

function baseModel(overrides: Partial<LessonDisplayModel> = {}): LessonDisplayModel {
  return {
    id: 'p1',
    title: '마커 멀리 뛰기',
    theme: '조절형',
    target: '초등 저학년',
    space: '체육관',
    participantFormat: '개인전',
    tags: [],
    functions: [],
    movements: [],
    equipment: ['마커 콘'],
    coachScript: '',
    previewCoachScript: '',
    briefingNotes: ['규칙 한 줄 설명'],
    setupNotes: ['마커 간격 확인'],
    safetyNotes: ['미끄럼 주의'],
    fieldTips: ['도약 타이밍을 본다'],
    activityMethod: ['준비 자세', '멀리 뛰기'],
    variationMethod: ['거리 늘리기'],
    quality: {
      status: 'READY',
      missing: [],
    },
    parentNote: '오늘 멀리 뛰기를 연습했습니다.',
    videoUrl: null,
    thumbnailUrl: null,
    heroImageUrl: null,
    setupImageUrl: null,
    galleryImageUrls: [],
    ...overrides,
  };
}

describe('lessonPlanExport', () => {
  it('locks P1.5 section order and Korean labels', () => {
    expect([...LESSON_PLAN_SECTION_ORDER]).toEqual([
      'title',
      'context',
      'equipment',
      'prep',
      'method',
      'variation',
      'coaching',
      'safety',
      'parentNote',
    ]);
    expect(LESSON_PLAN_SECTION_LABEL.title).toBe('수업명');
    expect(LESSON_PLAN_SECTION_LABEL.context).toBe('대상 · 공간 · 인원');
    expect(LESSON_PLAN_SECTION_LABEL.equipment).toBe('준비물');
    expect(LESSON_PLAN_SECTION_LABEL.prep).toBe('사전 준비');
    expect(LESSON_PLAN_SECTION_LABEL.method).toBe('활동 방법');
    expect(LESSON_PLAN_SECTION_LABEL.variation).toBe('변형');
    expect(LESSON_PLAN_SECTION_LABEL.coaching).toBe('지도 포인트');
    expect(LESSON_PLAN_SECTION_LABEL.safety).toBe('안전');
    expect(LESSON_PLAN_SECTION_LABEL.parentNote).toBe('학부모 안내문');
  });

  it('keeps fixed section order and hides empty sections', () => {
    const sections = buildLessonPlanSections(
      baseModel({
        equipment: [],
        variationMethod: [],
        parentNote: '',
        safetyNotes: ['정보 없음'],
      }),
    );
    expect(sections.map((section) => section.id)).toEqual([
      'title',
      'context',
      'prep',
      'method',
      'coaching',
    ]);
    expect(formatLessonPlanText(baseModel({ equipment: ['없음'] }))).not.toContain('없음');
    expect(formatLessonPlanText(baseModel({ equipment: ['없음'] }))).not.toContain('준비물');
  });

  it('formats clipboard text with labels', () => {
    const text = formatLessonPlanText(baseModel());
    expect(text).toContain('수업명\n마커 멀리 뛰기');
    expect(text).toContain('대상 · 공간 · 인원\n초등 저학년 · 체육관 · 개인전');
    expect(text).toContain('활동 방법\n1. 준비 자세\n2. 멀리 뛰기');
    expect(text).toContain('학부모 안내문\n오늘 멀리 뛰기를 연습했습니다.');
    expect(text).not.toContain('진행 방법');
  });

  it('emits full filled template in contract order', () => {
    const ids = buildLessonPlanSections(baseModel()).map((section) => section.id);
    expect(ids).toEqual([...LESSON_PLAN_SECTION_ORDER]);
  });
});
