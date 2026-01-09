import React from 'react';

export interface SessionEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  teacher: string;
  teacherId: string;
  type: string;
  status: string;
  groupId?: string;
  price: number;
  studentsText: string;
  themeColor: string;
  isAdmin: boolean;
  roundInfo?: string;
  mileageAction?: string; // 선택된 마일리지 액션 (하나만)
}

export interface TeacherInput {
  id: string;
  price: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: SessionEvent | null;
  editFields: {
    title: string;
    teachers: TeacherInput[];
    date: string;
    start: string;
    end: string;
    memo: string;
    mileageAction?: string; // 선택된 마일리지 액션
  };
  setEditFields: (fields: any) => void;
  teacherList: { id: string; name: string }[];
  onUpdate: () => void;
  onUpdateStatus: (status: string | null) => void;
  onPostpone: (e: React.MouseEvent) => void;
  onUndoPostpone: (e: React.MouseEvent) => void;
  onToggleMileage?: (label: string, val: number) => void;
  onAddTeacher?: () => void; // 강사 추가
  onRemoveTeacher?: (index: number) => void; // 강사 제거
}