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
    equipment: overrides.equipment ?? [],
    tags: overrides.tags ?? [],
    colors: ['#111827', '#334155', '#64748b', '#e2e8f0'],
    thumbnailUrl: overrides.thumbnailUrl,
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

  it('prefers the trusted video thumbnail and never reuses the setup image', () => {
    const candidate = program({
      id: 'video-first',
      title: '영상 우선',
      thumbnailUrl: 'https://example.com/dedicated.jpg',
      lessonDetail: {
        videoUrl: 'https://youtu.be/thumbnail1',
        setupImageUrl: 'https://example.supabase.co/storage/v1/object/public/setup.jpg',
      } as Program['lessonDetail'],
    });

    expect(selectRelatedLessonVideos(current, [candidate])).toEqual([
      expect.objectContaining({
        thumbnailUrl: 'https://img.youtube.com/vi/thumbnail1/hqdefault.jpg',
      }),
    ]);
  });

  it('does not use a setup image when no dedicated related thumbnail exists', () => {
    const candidate = program({
      id: 'setup-only',
      title: '세팅 이미지 제외',
      thumbnailUrl: 'https://example.supabase.co/storage/v1/object/public/setup.jpg',
      lessonDetail: {
        videoUrl: 'https://youtu.be/related12',
        setupImageUrl: 'https://example.supabase.co/storage/v1/object/public/setup.jpg',
      } as Program['lessonDetail'],
    });

    expect(selectRelatedLessonVideos(current, [candidate])[0]?.thumbnailUrl)
      .toBe('https://img.youtube.com/vi/related12/hqdefault.jpg');
  });

  it('excludes blocked videos through the current trusted-video policy', () => {
    const blocked = program({
      id: 'blocked',
      title: '차단 영상',
      lessonDetail: { videoUrl: 'https://youtu.be/7PJhBm5RkgY' } as Program['lessonDetail'],
    });

    expect(selectRelatedLessonVideos(current, [blocked])).toEqual([]);
  });

  it('keeps only candidates with a real tag, category, or grade relationship', () => {
    const baseDetail = { videoUrl: 'https://youtu.be/relevant1' } as Program['lessonDetail'];
    const unrelatedCurrent = program({ id: 'source', title: '기준', category: 'A', grade: '초등', tags: ['패스'] });
    const candidates = [
      program({ id: 'tag', title: '태그', category: 'B', grade: '중등', tags: ['패스'], lessonDetail: baseDetail }),
      program({ id: 'category', title: '카테고리', category: 'A', grade: '중등', tags: [], lessonDetail: baseDetail }),
      program({ id: 'grade', title: '학년', category: 'B', grade: '초등', tags: [], lessonDetail: baseDetail }),
      program({ id: 'zero', title: '무관', category: 'B', grade: '중등', tags: [], lessonDetail: baseDetail }),
    ];

    expect(selectRelatedLessonVideos(unrelatedCurrent, candidates).map((item) => item.id))
      .toEqual(['tag', 'category', 'grade']);
  });

  it('does not treat two empty categories as related', () => {
    const emptyCurrent = program({ id: 'empty-current', title: '기준', category: '', grade: '', tags: [] });
    const candidate = program({
      id: 'empty-candidate', title: '후보', category: '', grade: '', tags: [],
      lessonDetail: { videoUrl: 'https://youtu.be/emptycat1' } as Program['lessonDetail'],
    });

    expect(selectRelatedLessonVideos(emptyCurrent, [candidate])).toEqual([]);
  });

  it('returns exactly the available relevant count without padding', () => {
    const one = program({
      id: 'one', title: '하나', tags: ['패스'],
      lessonDetail: { videoUrl: 'https://youtu.be/onlyone1' } as Program['lessonDetail'],
    });
    const unrelated = program({
      id: 'unrelated', title: '무관', category: '다름', grade: '다름', tags: [],
      lessonDetail: { videoUrl: 'https://youtu.be/notrelat1' } as Program['lessonDetail'],
    });

    expect(selectRelatedLessonVideos(current, [current, one, unrelated])).toHaveLength(1);
  });

  it('picks one activity per similarity axis and does not repeat the same program', () => {
    const currentActivity = program({
      id: 'current-axes',
      title: '기준 활동',
      tags: ['신체 기능:민첩성', '움직임:이동', '패스'],
      equipment: ['라바콘 5개'],
    });
    const body = program({
      id: 'body',
      title: '신체',
      tags: ['신체 기능:민첩성'],
      lessonDetail: { videoUrl: 'https://youtu.be/bodyfunc1' } as Program['lessonDetail'],
    });
    const gear = program({
      id: 'gear',
      title: '교구',
      equipment: ['라바콘 12개'],
      lessonDetail: { videoUrl: 'https://youtu.be/samegear1' } as Program['lessonDetail'],
    });
    const move = program({
      id: 'move',
      title: '동작',
      tags: ['움직임:이동'],
      lessonDetail: { videoUrl: 'https://youtu.be/movepat1' } as Program['lessonDetail'],
    });
    const extra = program({
      id: 'extra',
      title: '가 태그',
      tags: ['패스', '협응력'],
      lessonDetail: { videoUrl: 'https://youtu.be/fallback1' } as Program['lessonDetail'],
    });

    const result = selectRelatedLessonVideos(currentActivity, [body, gear, move, extra]);
    expect(result.map((item) => ({ id: item.id, reason: item.reason }))).toEqual([
      { id: 'body', reason: '신체 기능 유사' },
      { id: 'gear', reason: '같은 교구' },
      { id: 'move', reason: '동작 패턴 유사' },
    ]);
  });
});
