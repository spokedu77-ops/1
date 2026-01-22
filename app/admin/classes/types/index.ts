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