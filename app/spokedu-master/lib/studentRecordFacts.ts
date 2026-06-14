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
