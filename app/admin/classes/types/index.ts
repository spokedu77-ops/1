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
  mileageAction?: string; // 선택된 마일리지 액션 (UI 반영용)
  
  // [필수 추가] 근본적인 빌드 에러 해결을 위한 속성
  session_type?: string;   // SessionEditModal.tsx 54번 줄 에러 해결
  mileage_option?: string; // page.tsx 데이터 로딩 에러 해결
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
    mileageAction?: string;
  };
  setEditFields: (fields: any) => void;
  teacherList: { id: string; name: string }[];
  onUpdate: () => void;
  onUpdateStatus: (status: string | null) => void;
  onPostpone: (e: React.MouseEvent) => void;
  onUndoPostpone: (e: React.MouseEvent) => void;
  onToggleMileage?: (label: string, val: number) => void;
  onAddTeacher?: () => void;
  onRemoveTeacher?: (index: number) => void;
}