import { describe, expect, it } from 'vitest';
import type { Program } from '../types';
import {
  buildLessonDisplayModel,
  getPreviewCoachScript,
  getPublicLessonTags,
  hasCanonicalTag,
  normalizeTagKey,
} from './lessonDisplayModel';

function program(overrides: Partial<Program> = {}): Program {
  return {
    id: '101',
    title: '관리자 제목',
    category: '협동',
    grade: '미취학',
    space: '교실',
    description: '레거시 설명',
    steps: ['활동 방법 1'],
    equipment: ['콘 4개'],
    tags: ['교실 체육', '미취학', '신체 기능:협응력', '움직임:이동', 'SPOMOVE'],
    colors: ['#000', '#111', '#222', '#333'],
    isPro: true,
    isNew: false,
    lessonDetail: {
      recommendedAge: '미취학',
      recommendedPlayers: '',
      objective: '',
      developmentFocus: '',
      coachScript: '관리자 수업 스크립트',
      parentNote: '학부모 문구',
      fieldTips: ['레거시 현장 정보'],
      variations: ['변형 방법 1'],
      safetyNotes: ['레거시 안전 정보'],
      relatedSpomoveIds: [],
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      heroImageUrl: '/hero.jpg',
      setupImageUrl: '/setup.jpg',
      galleryImageUrls: ['/gallery.jpg'],
      briefingNotes: ['사전 교육 1'],
      rules: ['관리자 활동 방법 1'],
      setupNotes: ['레거시 세팅 문구'],
    },
    ...overrides,
  };
}

describe('lessonDisplayModel', () => {
  it('uses current Program values without synthesizing legacy display sections', () => {
    const model = buildLessonDisplayModel(program());
    expect(model.title).toBe('관리자 제목');
    expect(model.coachScript).toBe('관리자 수업 스크립트');
    expect(model.activityMethod).toEqual(['관리자 활동 방법 1']);
    expect(model.variationMethod).toEqual(['변형 방법 1']);
    expect(model.safetyNotes).toEqual(['레거시 안전 정보']);
    expect(model.fieldTips).toEqual(['레거시 현장 정보']);
    expect(model.setupNotes).toEqual(['레거시 세팅 문구']);
    expect(model.quality.status).not.toBe('READY');
  });

  it('keeps public tags verbatim while excluding internal structure tags', () => {
    expect(buildLessonDisplayModel(program()).tags).toEqual(['교실 체육', '미취학']);
    expect(getPublicLessonTags(['  협동  ', '협동', '인원:12명'])).toEqual(['협동']);
  });

  it('normalizes NFKC and whitespace for classroom and preschool tags', () => {
    expect(normalizeTagKey(' 교실　체육 ')).toBe('교실체육');
    expect(hasCanonicalTag(program(), '교실체육')).toBe(true);
    expect(hasCanonicalTag(program(), '미 취 학')).toBe(true);
  });

  it('does not infer canonical tags from space or grade', () => {
    const withoutTags = program({ tags: [], space: '교실', grade: '미취학' });
    expect(hasCanonicalTag(withoutTags, '교실체육')).toBe(false);
    expect(hasCanonicalTag(withoutTags, '미취학')).toBe(false);
  });

  it('merges strength body function variants in display order', () => {
    const model = buildLessonDisplayModel(program({
      tags: [
        '신체 기능:근지구력',
        '신체 기능:민첩성',
        '신체 기능:근력',
        '신체 기능:근력·근지구력',
        '신체 기능:유연성',
      ],
    }));

    expect(model.functions).toEqual(['유연성', '민첩성', '근력·근지구력']);
  });

  it('extracts the first complete preview coach script', () => {
    expect(getPreviewCoachScript('첫 문장입니다.\n두 번째 문장입니다.')).toBe('첫 문장입니다.');
    expect(getPreviewCoachScript('• 불릿 첫 문장입니다.\n• 두 번째입니다.')).toBe('불릿 첫 문장입니다.');
    expect(getPreviewCoachScript('1. 번호 첫 문장입니다.\n2. 두 번째입니다.')).toBe('번호 첫 문장입니다.');
    expect(getPreviewCoachScript('"따옴표 문장입니다."\n다음 문장')).toBe('"따옴표 문장입니다."');
    expect(getPreviewCoachScript('Ready. Next sentence.')).toBe('Ready.');
    expect(getPreviewCoachScript('구분 없는 문자열')).toBe('구분 없는 문자열');
    expect(getPreviewCoachScript('   ')).toBe('');
  });
});
