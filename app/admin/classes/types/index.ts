// types.ts 파일 하단에 추가

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
  setEditFields: React.Dispatch<React.SetStateAction<any>>;
  teacherList: any[];
  onUpdate: () => Promise<void>;
  onUpdateStatus: (status: string | null) => Promise<void>;
  onPostpone: (e: React.MouseEvent) => Promise<void>;
  onUndoPostpone: (e: React.MouseEvent) => Promise<void>;
  // 에러의 핵심: 인자 타입을 명확히 규정합니다.
  onToggleMileage: (label: string, val: number) => Promise<void>; 
}