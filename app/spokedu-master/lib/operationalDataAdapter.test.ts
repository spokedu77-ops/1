import { describe, expect, it } from 'vitest';
import {
  classRecordToCreateInput,
  toClassRecord,
  toStudentProfile,
} from './operationalDataAdapter';
import type { ClassRecord } from '../types';
import type { MasterClassRecordDto, MasterStudentDto } from '../types/operational';

const serverStudent: MasterStudentDto = {
  id: '11111111-1111-4111-8111-111111111111',
  legacyId: 'legacy-student-1',
  name: '학생 1',
  group: 'A',
  meta: '만 8세 / 수강 6개월',
  createdAt: '2026-06-17T00:00:00.000Z',
  updatedAt: '2026-06-17T00:00:00.000Z',
};

describe('operational data adapter', () => {
  it('keeps server UUID as the runtime student id and preserves string meta', () => {
    expect(toStudentProfile(serverStudent)).toMatchObject({
      id: serverStudent.id,
      name: serverStudent.name,
      group: serverStudent.group,
      meta: serverStudent.meta,
      level: '',
      attendance: 0,
      streak: 0,
      risk: null,
      skills: [],
      badges: [],
    });
  });

  it('maps server class records to fact-based runtime records', () => {
    const dto: MasterClassRecordDto = {
      id: 'record-server-1',
      legacyId: 'legacy-record-1',
      date: '2026-06-17',
      lessonTitle: '밴드 씨름',
      classId: 'QA',
      programId: 52,
      programTitle: '밴드 씨름',
      recordType: 'detailed',
      memo: '메모',
      parentNoteSnapshot: '안내',
      students: [
        {
          id: 'child-1',
          studentId: serverStudent.id,
          studentLegacyId: serverStudent.legacyId,
          studentName: serverStudent.name,
          attendance: 'present',
          focused: true,
          skills: ['협응력'],
          memo: '좋음',
        },
      ],
      present: 1,
      absent: 0,
      focusCount: 1,
      skillCount: 1,
      createdAt: '2026-06-17T00:00:00.000Z',
      updatedAt: '2026-06-17T00:00:00.000Z',
    };

    expect(toClassRecord(dto)).toMatchObject({
      id: dto.id,
      programId: '52',
      present: 1,
      absent: 0,
      focusCount: 1,
      skillCount: 1,
      students: [
        {
          studentId: serverStudent.id,
          studentName: serverStudent.name,
          attendance: 'present',
          focused: true,
          skills: ['협응력'],
        },
      ],
    });
  });

  it('builds create payloads with server UUIDs and without derived aggregate fields or ownerId', () => {
    const record: ClassRecord = {
      id: 'client-record-1',
      lessonTitle: '밴드 씨름',
      classId: 'QA',
      programId: '52',
      programTitle: '밴드 씨름',
      date: '2026-06-17',
      present: 99,
      absent: 88,
      focusCount: 77,
      skillCount: 66,
      kakaoSent: false,
      students: [
        {
          studentId: serverStudent.id,
          studentName: serverStudent.name,
          attendance: 'present',
          focused: true,
          skills: ['협응력'],
          memo: '메모',
        },
      ],
      memo: '전체 메모',
      parentNoteSnapshot: '안내',
      recordType: 'detailed',
    };

    const input = classRecordToCreateInput(record, [serverStudent]);

    expect(input).toMatchObject({
      legacyId: record.id,
      programId: 52,
      students: [
        {
          studentId: serverStudent.id,
          studentLegacyId: serverStudent.legacyId,
          studentName: serverStudent.name,
          attendance: 'present',
          focused: true,
          skills: ['협응력'],
          memo: '메모',
        },
      ],
    });
    expect(input).not.toHaveProperty('ownerId');
    expect(input).not.toHaveProperty('present');
    expect(input).not.toHaveProperty('absent');
    expect(input).not.toHaveProperty('focusCount');
    expect(input).not.toHaveProperty('skillCount');
  });
});
