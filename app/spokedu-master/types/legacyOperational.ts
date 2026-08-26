import type { MasterStudentMeta } from './operational';

export type ExistingRecordType = 'quick' | 'detailed' | 'lesson_note';
export type ExistingAttendanceStatus = 'pending' | 'present' | 'absent';
export type ObservationScore = 1 | 2 | 3;

export type MasterClassRecordStudentDto = {
  id: string; studentId: string | null; studentLegacyId: string | null; studentName: string;
  attendance: ExistingAttendanceStatus; focused: boolean; skills: string[]; memo: string | null;
  observationScore?: ObservationScore | null; createdAt: string; updatedAt: string;
};

export type MasterClassRecordDto = {
  id: string; sessionId?: string | null; legacyId: string | null; date: string; lessonTitle: string | null;
  classId: string | null; programId: number | null; programTitle: string | null;
  recordType: ExistingRecordType; memo: string | null; applicationIdea?: string | null;
  parentNoteSnapshot: string | null; present: number; absent: number; focusCount: number;
  skillCount: number; students: MasterClassRecordStudentDto[]; createdAt: string; updatedAt: string;
};

export type CreateClassRecordStudentInput = {
  studentId: string | null; studentLegacyId: string | null; studentName: string;
  attendance: ExistingAttendanceStatus; focused: boolean; skills: string[]; memo: string | null;
  observationScore?: ObservationScore | null;
};

export type CreateClassRecordInput = {
  legacyId: string | null; date: string; lessonTitle: string | null; classId: string | null;
  programId: number | null; programTitle: string | null; recordType: ExistingRecordType;
  memo: string | null; applicationIdea?: string | null; parentNoteSnapshot: string | null;
  students: CreateClassRecordStudentInput[];
};

export type UpdateClassRecordInput = CreateClassRecordInput;

/** Compatibility shape for archived student payloads. Active membership is ClassStudent, never group. */
export type LegacyStudentCompatibility = { group: string | null; meta: MasterStudentMeta };
