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

/** 범죄경력조회 첨부 파일 1건 (centers.criminal_check_files jsonb) */
export interface CriminalCheckFile {
  name: string;
  path: string;
}

/** 센터 운영/수업 히스토리 1행 */
export interface CenterHistoryEntry {
  id: string;
  center_id: string;
  created_at: string;
  body: string;
  created_by: string | null;
  /** 조인 시에만 */
  author_name?: string | null;
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
  contact_email: string | null;
  contact_role: string | null;
  status: CenterStatus;
  contract_start: string | null;
  contract_end: string | null;
  session_fee: number | null;
  main_teacher_id: string | null;
  main_teacher_2_id: string | null;
  main_teacher_3_id: string | null;
  weekly_schedule: WeeklyScheduleSlot[];
  instructors_default: InstructorsDefault;
  highlights: string | null;
  criminal_check_facility_id: string | null;
  criminal_check_facility_password: string | null;
  criminal_check_files: CriminalCheckFile[];
  created_at: string;
  updated_at: string;
  /** 조인 결과: getCenters/getCenterById 에서만 채워짐 */
  main_teacher_name?: string | null;
  main_teacher_2_name?: string | null;
  main_teacher_3_name?: string | null;
}
