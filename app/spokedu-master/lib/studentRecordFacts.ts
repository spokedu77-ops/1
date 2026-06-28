import type { ClassRecord } from '../types';

export type StudentRecordFacts = {
  recordCount: number;
  presentCount: number;
  absentCount: number;
  focusedCount: number;
  skillTags: string[];
  latestDate: string | null;
};

export type ClassRecordFacts = {
  recordCount: number;
  presentCount: number;
  absentCount: number;
  recordedStudentCount: number;
};

export type ClassPreparationSummary = {
  recordId: string;
  programId: string;
  programTitle: string;
  date: string;
  presentCount: number;
  participantNames: string[];
  memoCount: number;
  skillCount: number;
  hasClassMemo: boolean;
};

export function getStudentRecordFacts(
  records: ClassRecord[],
  studentId: string,
): StudentRecordFacts {
  const studentRecords = records
    .flatMap((record) => {
      const student = record.students.find((item) => item.studentId === studentId);
      return student ? [{ record, student }] : [];
    })
    .sort(
      (a, b) =>
        new Date(b.record.date).getTime() - new Date(a.record.date).getTime(),
    );

  return {
    recordCount: studentRecords.length,
    presentCount: studentRecords.filter(
      ({ student }) => student.attendance === 'present',
    ).length,
    absentCount: studentRecords.filter(
      ({ student }) => student.attendance === 'absent',
    ).length,
    focusedCount: studentRecords.filter(({ student }) => student.focused).length,
    skillTags: Array.from(
      new Set(
        studentRecords.flatMap(({ student }) =>
          student.skills.map((skill) => skill.trim()).filter(Boolean),
        ),
      ),
    ),
    latestDate: studentRecords[0]?.record.date ?? null,
  };
}

export function getClassRecordFacts(records: ClassRecord[]): ClassRecordFacts {
  const studentEntries = records.flatMap((record) => record.students);

  return {
    recordCount: records.length,
    presentCount: studentEntries.filter(
      (student) => student.attendance === 'present',
    ).length,
    absentCount: studentEntries.filter(
      (student) => student.attendance === 'absent',
    ).length,
    recordedStudentCount: new Set(
      studentEntries.map((student) => student.studentId),
    ).size,
  };
}

export function getLatestClassPreparationSummary(
  records: ClassRecord[],
): ClassPreparationSummary | null {
  const latestRecord = [...records]
    .filter((record) => record.programId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (!latestRecord) return null;

  const presentStudents = latestRecord.students.filter(
    (student) => student.attendance === 'present',
  );
  const memoCount = latestRecord.students.filter((student) => student.memo?.trim()).length;

  return {
    recordId: latestRecord.id,
    programId: latestRecord.programId,
    programTitle: latestRecord.programTitle || latestRecord.lessonTitle,
    date: latestRecord.date,
    presentCount: latestRecord.present || presentStudents.length,
    participantNames: presentStudents.map((student) => student.studentName).filter(Boolean).slice(0, 3),
    memoCount,
    skillCount: latestRecord.students.filter((student) => student.skills.some((skill) => skill.trim())).length,
    hasClassMemo: Boolean(latestRecord.memo?.trim()),
  };
}
