import { describe, expect, it } from 'vitest';

import type { Program } from '../types';
import { selectRelatedLessonVideos } from './relatedLessonVideos';

function program(overrides: Partial<Program> & Pick<Program, 'id' | 'title'>): Program {
  return {
    id: overrides.id,
    title: overrides.title,
    category: overrides.category ?? '도전형',
    grade: overrides.grade ?? '초등학생',
    space: '체육관',
    description: '',
    steps: [],
    equipment: [],
    tags: overrides.tags ?? [],
    colors: ['#111827', '#334155', '#64748b', '#e2e8f0'],
    isPro: false,
    isNew: false,
    lessonDetail: {
      recommendedAge: '', recommendedPlayers: '', objective: '', developmentFocus: '',
      coachScript: '', parentNote: '', fieldTips: [], variations: [], safetyNotes: [],
      relatedSpomoveIds: [], videoUrl: overrides.lessonDetail?.videoUrl,
      setupImageUrl: overrides.lessonDetail?.setupImageUrl,
    },
  };
}

describe('selectRelatedLessonVideos', () => {
  const current = program({ id: 'current', title: '현재 수업', tags: ['패스', '협응력'] });

  it('uses only other programs with playable videos and caps the result at three', () => {
    const candidates = [
      current,
      program({ id: 'no-video', title: '영상 없음', tags: ['패스'] }),
      ...['a', 'b', 'c', 'd'].map((id) => program({
        id,
        title: `영상 ${id}`,
        tags: ['패스'],
        lessonDetail: { videoUrl: `https://youtu.be/video${id}1` } as Program['lessonDetail'],
      })),
    ];

    const result = selectRelatedLessonVideos(current, candidates);
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.id)).not.toContain('current');
    expect(result.map((item) => item.id)).not.toContain('no-video');
  });

  it('prioritizes public-tag overlap, then category and grade, with a stable tie break', () => {
    const candidates = [
      program({ id: 'category', title: '나 카테고리', tags: [], lessonDetail: { videoUrl: 'https://youtu.be/category1' } as Program['lessonDetail'] }),
      program({ id: 'tag-b', title: '다 태그', tags: ['패스'], category: '다른형', lessonDetail: { videoUrl: 'https://youtu.be/tagbbb1' } as Program['lessonDetail'] }),
      program({ id: 'tag-a', title: '가 태그', tags: ['패스'], category: '다른형', lessonDetail: { videoUrl: 'https://youtu.be/tagaaa1' } as Program['lessonDetail'] }),
    ];

    expect(selectRelatedLessonVideos(current, candidates).map((item) => item.id)).toEqual([
      'tag-a', 'tag-b', 'category',
    ]);
  });
});
