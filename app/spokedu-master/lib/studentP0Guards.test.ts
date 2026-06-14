import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { useMasterStore } from '../store';
import type { ClassRecord, StudentProfile } from '../types';

const root = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const legacyStudent: StudentProfile = {
  id: 'student-1',
  name: '학생 1',
  group: 'A',
  meta: '8세',
  level: 'Lv.9 Legacy',
  attendance: 87,
  classes: 19,
  streak: 4,
  risk: 'legacy risk',
  skills: [{ label: '균형', value: 44, delta: '+3%' }],
  badges: ['legacy badge'],
  history: ['legacy history'],
};

const rawRecord: ClassRecord = {
  id: 'record-1',
  lessonTitle: '균형 수업',
  classId: 'A',
  programId: 'program-1',
  programTitle: '균형 수업',
  date: '2026-06-15T09:00:00.000Z',
  present: 1,
  absent: 0,
  focusCount: 1,
  skillCount: 1,
  kakaoSent: false,
  students: [
    {
      studentId: legacyStudent.id,
      studentName: legacyStudent.name,
      attendance: 'present',
      focused: true,
      skills: ['협동'],
      memo: '실제 관찰 메모',
    },
  ],
};

const originalState = useMasterStore.getState();

afterEach(() => {
  useMasterStore.setState(originalState, true);
});

describe('student P0 guards', () => {
  it('stores raw class records without changing legacy derived student fields', () => {
    useMasterStore.setState({
      ...originalState,
      profile: null,
      recentActivityOwnerResolved: false,
      students: [legacyStudent],
      classRecords: [],
      notifications: [],
      operational: {
        online: true,
        lastSyncAt: null,
        retryQueue: [],
      },
    });

    useMasterStore.getState().saveClassRecord(rawRecord);

    expect(useMasterStore.getState().students).toEqual([legacyStudent]);
    expect(useMasterStore.getState().classRecords[0]).toMatchObject({
      id: rawRecord.id,
      programId: rawRecord.programId,
      date: rawRecord.date,
      students: rawRecord.students,
    });
  });

  it('creates new students without fabricated level or attendance values', () => {
    useMasterStore.setState({
      ...originalState,
      students: [],
    });

    useMasterStore.getState().addStudent('학생 2', 'B', '9세', 'student-2');

    expect(useMasterStore.getState().students[0]).toMatchObject({
      id: 'student-2',
      level: '',
      attendance: 0,
      classes: 0,
      streak: 0,
      risk: null,
      skills: [],
      badges: [],
      history: [],
    });
  });

  it('does not expose student data from the blocked parent route', () => {
    const source = readSource('app/spokedu-master/parent/[studentId]/page.tsx');

    expect(source).toContain('현재 공유 링크는 사용할 수 없습니다.');
    expect(source).not.toContain('useMasterStore');
    expect(source).not.toContain('validateParentShareToken');
    expect(source).not.toContain('student.name');
    expect(source).not.toContain('classRecords');
  });

  it('does not render parent share link creation controls', () => {
    const studentsSource = readSource('app/spokedu-master/students/page.tsx');
    const recordsSource = readSource('app/spokedu-master/class-record/page.tsx');

    expect(studentsSource).not.toContain('createParentShareToken');
    expect(studentsSource).not.toContain('보호자 링크 복사');
    expect(recordsSource).not.toContain('createParentShareToken');
    expect(recordsSource).not.toContain('보호자 링크 미리보기');
  });

  it('does not calculate director attendance from student profile percentages', () => {
    const source = readSource('app/spokedu-master/director/page.tsx');

    expect(source).not.toContain('student.attendance');
    expect(source).not.toContain('평균 출석률');
    expect(source).toContain('getClassRecordFacts(records)');
  });
});
