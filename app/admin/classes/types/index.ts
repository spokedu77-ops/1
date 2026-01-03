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
  };
  setEditFields: (fields: any) => void;
  teacherList: { id: string; name: string }[];
  onUpdate: () => void;
  onUpdateStatus: (status: string | null) => void;
  onPostpone: (e: React.MouseEvent) => void;
  onUndoPostpone: (e: React.MouseEvent) => void;
  onToggleMileage?: (label: string, val: number) => void; // ? 추가해서 안전하게 설정
}