/**
 * 센터 정보 MVP 타입
 */

export type CenterStatus = 'active' | 'paused' | 'ended';
export type ProgramStatus = 'active' | 'done';
export type CenterLogType = 'request' | 'issue' | 'result' | 'note';

/** 주간 시간표 1행 */
export interface WeeklyScheduleSlot {
  day: string;
  start: string;
  end: string;
  place: string;
  note: string;
}

/** 강사 기본배정 (jsonb) */
export interface InstructorsDefault {
  main: string | null;
  sub: string | null;
  backup: string[];
}

/** next_actions 1항목 */
export interface NextActionItem {
  id: string;
  text: string;
  done: boolean;
}

/** programs.instructors (jsonb) */
export interface ProgramInstructors {
  main?: string | null;
  sub?: string | null;
}

/** center_finance_terms.doc_checklist (jsonb) */
export type DocChecklistItem = string;

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
  weekly_schedule: WeeklyScheduleSlot[];
  instructors_default: InstructorsDefault;
  highlights: string | null;
  next_actions: NextActionItem[];
  created_at: string;
  updated_at: string;
}

export interface CenterFinanceTerms {
  id: string;
  center_id: string;
  unit_price: number | null;
  payment_day: string | null;
  invoice_required: boolean;
  doc_checklist: DocChecklistItem[];
  special_terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  center_id: string;
  name: string;
  term: string | null;
  start_date: string | null;
  end_date: string | null;
  sessions_count: number | null;
  instructors: ProgramInstructors;
  note: string | null;
  status: ProgramStatus;
  created_at: string;
  updated_at: string;
}

export interface CenterLog {
  id: string;
  center_id: string;
  log_date: string;
  type: CenterLogType;
  content: string;
  next_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface CenterFile {
  id: string;
  center_id: string;
  title: string;
  url: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface CenterWithRelations extends Center {
  finance_terms: CenterFinanceTerms | null;
  programs: Program[];
  logs: CenterLog[];
  files: CenterFile[];
}
