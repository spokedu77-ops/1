export type ExistingRecordType = 'quick' | 'detailed' | 'lesson_note';
export type ExistingAttendanceStatus = 'pending' | 'present' | 'absent';
export type ObservationScore = 1 | 2 | 3;
export type MasterStudentMeta = string | Record<string, unknown>;
export type MasterSessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type MasterSessionAttendanceStatus = 'present' | 'absent';

export type MasterClassDto = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type MasterSessionProgramDto = {
  id: string;
  programId: number;
  programTitle: string | null;
  sortOrder: number;
  isCompleted: boolean;
};

export type MasterSessionAttendanceDto = {
  id: string;
  studentId: string;
  status: MasterSessionAttendanceStatus;
};

export type MasterSessionDto = {
  id: string;
  classId: string;
  className: string;
  startAt: string;
  endAt: string;
  status: MasterSessionStatus;
  memo: string | null;
  completedAt: string | null;
  programs: MasterSessionProgramDto[];
  attendance: MasterSessionAttendanceDto[];
  createdAt: string;
  updatedAt: string;
};

export type SaveSessionInput = {
  classId: string;
  startAt: string;
  endAt: string;
  status: MasterSessionStatus;
  memo: string | null;
  programs: Array<{
    programId: number;
    programTitle: string | null;
    sortOrder: number;
    isCompleted: boolean;
  }>;
  attendance: Array<{
    studentId: string;
    status: MasterSessionAttendanceStatus;
  }>;
};

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
