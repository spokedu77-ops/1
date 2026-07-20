export interface SessionEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  teacher: string;
  teacherId: string;
  /** memo EXTRA_TEACHERS 보조 강사 id (캘린더 선생님 필터용) */
  extraTeacherIds?: string[];
  type: string;
  status: string | null;
  groupId?: string;
  price: number;
  studentsText: string;
  themeColor: string;
  isAdmin: boolean;
  roundInfo?: string;
  mileageAction?: string;
  session_type?: string;
  mileage_option?: string;
  roundIndex?: number;
  roundTotal?: number;
  roundDisplay?: string;
  /** 수업 관리용 학생 정보/메모 (피드백과 별도, sessions.memo) */
  memo?: string;
}

export interface TeacherInput {
  id: string;
  price: number;
}

export interface MileageAction {
  label: string;
  val: number;
}

// 수업 목록/상세 뷰에서 사용하는 그룹 단위 타입
export interface ClassGroup {
  groupId: string;
  title: string;
  roundTotal: number;
  completedCount: number;
  firstClassAt: string;
  lastClassAt: string;
  teacherIds: string[];
}

// 2-step 개설 및 회차 편집 테이블에서 사용하는 편집용 회차 타입
export interface EditableSession {
  roundIndex: number;
  startAt: Date;
  endAt: Date;
  teacherId: string;
  price: number;
}
