/**
 * 센터 관리 핵심 타입 (압축 리뉴얼)
 */

export type CenterStatus = 'active' | 'paused' | 'ended';

/** 주간 시간표 1행 (centers.weekly_schedule jsonb) */
export interface WeeklyScheduleSlot {
  day: string;
  start: string;
  end: string;
  place: string;
  note: string;
}

/** 강사 기본배정 (centers.instructors_default jsonb) */
export interface InstructorsDefault {
  main: string | null;
  sub: string | null;
  backup: string[];
}

/** next_actions 1항목 (centers.next_actions jsonb) */
export interface NextActionItem {
  id: string;
  text: string;
  done: boolean;
}

/** 강사 선택 목록 항목 */
export interface TeacherOption {
  id: string;
  name: string;
}

export interface Center {
  id: string;
  name: string;
  region_tag: string | null;
  address: string | null;
  access_note: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  status: CenterStatus;
  contract_start: string | null;
  contract_end: string | null;
  session_fee: number | null;
  main_teacher_id: string | null;
  weekly_schedule: WeeklyScheduleSlot[];
  instructors_default: InstructorsDefault;
  highlights: string | null;
  next_actions: NextActionItem[];
  created_at: string;
  updated_at: string;
  /** 조인 결과: getCenters/getCenterById 에서만 채워짐 */
  main_teacher_name?: string | null;
}
