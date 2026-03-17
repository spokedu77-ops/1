import React from 'react';

export interface SessionEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  teacher: string;
  teacherId: string;
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

export interface EditFields {
  title: string;
  teachers: TeacherInput[];
  date: string;
  start: string;
  end: string;
  memo: string;
  mileageAction?: string;
  roundIndex?: number;
  roundTotal?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: SessionEvent | null;
  editFields: EditFields;
  setEditFields: React.Dispatch<React.SetStateAction<EditFields>>;
  teacherList: { id: string; name: string }[];
  onUpdate: () => void;
  onUpdateStatus: (status: string | null) => void;
  onPostpone: (e: React.MouseEvent) => void;
  onUndoPostpone: (e: React.MouseEvent) => void;
  onAddTeacher?: () => void;
  onRemoveTeacher?: (index: number) => void;
  onShrinkGroup?: () => void;
  onCloneGroup?: () => void;
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