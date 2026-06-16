import type { ClassRecord, StudentProfile } from '../types';
import type {
  CreateClassRecordInput,
  MasterClassRecordDto,
  MasterStudentDto,
  MasterStudentMeta,
} from '../types/operational';

export function studentMetaToDisplay(meta: MasterStudentMeta): string {
  if (typeof meta === 'string') return meta;
  const values = Object.values(meta).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return values.join(' / ');
}

export function toStudentProfile(dto: MasterStudentDto): StudentProfile {
  return {
    id: dto.id,
    name: dto.name,
    group: dto.group ?? '',
    meta: studentMetaToDisplay(dto.meta),
    level: '',
    attendance: 0,
    classes: 0,
    streak: 0,
    risk: null,
    skills: [],
    badges: [],
    history: [],
  };
}

export function toClassRecord(dto: MasterClassRecordDto): ClassRecord {
  return {
    id: dto.id,
    lessonTitle: dto.lessonTitle ?? '',
    classId: dto.classId ?? '',
    programId: dto.programId == null ? '' : String(dto.programId),
    programTitle: dto.programTitle ?? '',
    date: dto.date,
    present: dto.present,
    absent: dto.absent,
    focusCount: dto.focusCount,
    skillCount: dto.skillCount,
    kakaoSent: false,
    students: dto.students.map((student) => ({
      studentId: student.studentId ?? student.studentLegacyId ?? '',
      studentName: student.studentName,
      attendance: student.attendance,
      focused: student.focused,
      skills: student.skills,
      memo: student.memo ?? undefined,
    })),
    memo: dto.memo ?? undefined,
    parentNoteSnapshot: dto.parentNoteSnapshot ?? undefined,
    recordType: dto.recordType,
  };
}

export function classRecordToCreateInput(record: ClassRecord, serverStudents: MasterStudentDto[]): CreateClassRecordInput {
  const studentById = new Map(serverStudents.map((student) => [student.id, student]));
  return {
    legacyId: record.id,
    date: record.date,
    lessonTitle: record.lessonTitle || null,
    classId: record.classId || null,
    programId: record.programId ? Number(record.programId) : null,
    programTitle: record.programTitle || null,
    recordType: record.recordType ?? 'detailed',
    memo: record.memo ?? null,
    parentNoteSnapshot: record.parentNoteSnapshot ?? null,
    students: record.students.map((student) => {
      const serverStudent = studentById.get(student.studentId);
      return {
        studentId: serverStudent?.id ?? null,
        studentLegacyId: serverStudent?.legacyId ?? null,
        studentName: student.studentName,
        attendance: student.attendance,
        focused: student.focused,
        skills: student.skills,
        memo: student.memo ?? null,
      };
    }),
  };
}
