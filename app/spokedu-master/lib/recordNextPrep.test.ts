import { describe, expect, it } from 'vitest';
import { selectLatestApplicationIdea } from './recordNextPrep';
import type { ClassRecord } from '../types';

function record(id: string, programId: string, date: string, applicationIdea?: string): ClassRecord {
  return { id, programId, programTitle: programId, date, lessonTitle: '수업', classId: 'A반', present: 0, absent: 0, focusCount: 0, skillCount: 0, kakaoSent: false, students: [], applicationIdea };
}

describe('record to next prep continuity', () => {
  it('returns only the latest non-empty idea for the requested program', () => {
    const selected = selectLatestApplicationIdea([
      record('old', '52', '2026-08-01', '이전 적용점'),
      record('empty', '52', '2026-08-20', '  '),
      record('other', '53', '2026-08-21', '다른 프로그램 적용점'),
      record('latest', '52', '2026-08-19', '최신 적용점'),
    ], '52');
    expect(selected?.id).toBe('latest');
  });

  it('returns null when the program has no application idea', () => {
    expect(selectLatestApplicationIdea([record('empty', '52', '2026-08-20')], '52')).toBeNull();
  });
});
