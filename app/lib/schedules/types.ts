/**
 * 일정(schedules) 타입
 */

export type ScheduleStatus = 'active' | 'done';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Schedule {
  id: string;
  title: string;
  assignee: string | null;
  start_date: string | null;
  end_date: string | null;
  sessions_count: number | null;
  note: string | null;
  checklist: ChecklistItem[];
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}
