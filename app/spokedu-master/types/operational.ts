export type ExistingRecordType = 'quick' | 'detailed' | 'lesson_note';
export type ExistingAttendanceStatus = 'pending' | 'present' | 'absent';
export type ObservationScore = 1 | 2 | 3;
export type MasterStudentMeta = string | Record<string, unknown>;

export type MasterStudentDto = {
  id: string;
  legacyId: string | null;
  name: string;
  group: string | null;
  meta: MasterStudentMeta;
  guidanceNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MasterClassRecordStudentDto = {
  id: string;
  studentId: string | null;
  studentLegacyId: string | null;
  studentName: string;
  attendance: ExistingAttendanceStatus;
  focused: boolean;
  skills: string[];
  memo: string | null;
  observationScore?: ObservationScore | null;
  createdAt: string;
  updatedAt: string;
};

export type MasterClassRecordDto = {
  id: string;
  legacyId: string | null;
  date: string;
  lessonTitle: string | null;
  classId: string | null;
  programId: number | null;
  programTitle: string | null;
  recordType: ExistingRecordType;
  memo: string | null;
  applicationIdea?: string | null;
  parentNoteSnapshot: string | null;
  present: number;
  absent: number;
  focusCount: number;
  skillCount: number;
  students: MasterClassRecordStudentDto[];
  createdAt: string;
  updatedAt: string;
};

export type CreateStudentInput = {
  legacyId: string | null;
  name: string;
  group: string | null;
  meta: MasterStudentMeta;
  guidanceNote?: string | null;
};

export type UpdateStudentInput = {
  name: string;
  group: string | null;
  meta: MasterStudentMeta;
  guidanceNote?: string | null;
};

export type CreateClassRecordStudentInput = {
  studentId: string | null;
  studentLegacyId: string | null;
  studentName: string;
  attendance: ExistingAttendanceStatus;
  focused: boolean;
  skills: string[];
  memo: string | null;
  observationScore?: ObservationScore | null;
};

export type CreateClassRecordInput = {
  legacyId: string | null;
  date: string;
  lessonTitle: string | null;
  classId: string | null;
  programId: number | null;
  programTitle: string | null;
  recordType: ExistingRecordType;
  memo: string | null;
  applicationIdea?: string | null;
  parentNoteSnapshot: string | null;
  students: CreateClassRecordStudentInput[];
};

export type UpdateClassRecordInput = CreateClassRecordInput;
