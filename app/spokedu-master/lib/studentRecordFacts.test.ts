import { describe, expect, it } from 'vitest';
import type { ClassRecord } from '../types';
import { getClassRecordFacts, getStudentRecordFacts } from './studentRecordFacts';

const record: ClassRecord = {
  id: 'record-1',
  lessonTitle: '균형 수업',
  classId: 'A',
  programId: 'program-1',
  programTitle: '균형 수업',
  date: '2026-06-15T09:00:00.000Z',
  present: 1,
  absent: 1,
  focusCount: 1,
  skillCount: 2,
  kakaoSent: false,
  students: [
    {
      studentId: 'student-1',
      studentName: '학생 1',
      attendance: 'present',
      focused: true,
      skills: ['균형', '협동'],
      memo: '실제 관찰 메모',
    },
    {
      studentId: 'student-2',
      studentName: '학생 2',
      attendance: 'absent',
      focused: false,
      skills: [],
    },
  ],
};

describe('student record facts', () => {
  it('uses only raw class record facts without percentages or growth scores', () => {
    expect(getStudentRecordFacts([record], 'student-1')).toEqual({
      recordCount: 1,
      presentCount: 1,
      absentCount: 0,
      focusedCount: 1,
      skillTags: ['균형', '협동'],
      latestDate: record.date,
    });
  });

  it('aggregates director facts from raw student attendance entries', () => {
    expect(getClassRecordFacts([record])).toEqual({
      recordCount: 1,
      presentCount: 1,
      absentCount: 1,
      recordedStudentCount: 2,
    });
  });
});
