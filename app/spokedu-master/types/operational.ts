export type MasterStudentMeta = string | Record<string, unknown>;
export type MasterSessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type MasterSessionAttendanceStatus = 'present' | 'absent';

export type MasterClassDto = {
  id: string;
  name: string;
  studentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type MasterSessionProgramDto = {
  /** Ordered Session activity. Foundation sources are intentionally limited to these two. */
  id: string;
  sourceType: 'program' | 'spomove';
  programId: number | null;
  spomovePresetId: string | null;
  programTitle: string | null;
  sortOrder: number;
  isCompleted: boolean;
};

export type MasterSessionAttendanceDto = {
  id: string;
  studentId: string;
  studentName: string;
  status: MasterSessionAttendanceStatus;
};

export type MasterSessionDto = {
  id: string;
  classId: string;
  className: string;
  startAt: string;
  startedAt: string | null;
  endAt: string;
  status: MasterSessionStatus;
  memo: string | null;
  completedAt: string | null;
  programs: MasterSessionProgramDto[];
  attendance: MasterSessionAttendanceDto[];
  createdAt: string;
  updatedAt: string;
  scheduleRuleId?: string | null;
};

export type SaveSessionInput = {
  classId: string;
  startAt: string;
  endAt: string;
  status: MasterSessionStatus;
  memo: string | null;
  programs?: Array<{
    sourceType: 'program' | 'spomove';
    programId: number | null;
    spomovePresetId: string | null;
  }>;
};

export type SaveSessionAttendanceInput = Array<{
  studentId: string;
  status: MasterSessionAttendanceStatus;
}>;

export type MasterStudentDto = {
  id: string;
  legacyId: string | null;
  name: string;
  meta: MasterStudentMeta;
  guidanceNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStudentInput = {
  legacyId: string | null;
  name: string;
  meta: MasterStudentMeta;
  guidanceNote?: string | null;
  classIds: string[];
};

export type UpdateStudentInput = {
  name: string;
  meta: MasterStudentMeta;
  guidanceNote?: string | null;
  classIds: string[];
};
