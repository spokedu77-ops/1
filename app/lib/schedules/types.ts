/**
 * 일정(schedules) 타입
 */

export type ScheduleStatus = 'scheduled' | 'active' | 'done';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Schedule {
  id: string;
  title: string;
  assignee: string | null;
  center_id: string | null;
  start_date: string | null;
  end_date: string | null;
  /** 특정 일자만 수업 시 (단회/2회기). 있으면 이 날짜들만 표시, 없으면 start_date~end_date 기간 표시 */
  session_dates: string[] | null;
  start_time: string | null;
  end_time: string | null;
  day_of_week: number[] | null;
  sessions_count: number | null;
  note: string | null;
  checklist: ChecklistItem[];
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}
