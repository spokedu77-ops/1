import { addSeoulSessionDays, getSeoulSessionDay, seoulDayToDate } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

export type MonthCalendarDay = { day: string; inMonth: boolean; sessions: MasterSessionDto[] };

export function getMonthKey(day: string) { return day.slice(0, 7); }

export function moveMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const moved = new Date(Date.UTC(year, monthNumber - 1 + offset, 15));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthCalendar(month: string, sessions: MasterSessionDto[]): MonthCalendarDay[] {
  const firstDay = `${month}-01`;
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(seoulDayToDate(firstDay));
  const mondayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
  const gridStart = addSeoulSessionDays(firstDay, -mondayIndex);
  const sessionsByDay = new Map<string, MasterSessionDto[]>();
  for (const session of sessions) {
    const day = getSeoulSessionDay(session.startAt);
    sessionsByDay.set(day, [...(sessionsByDay.get(day) ?? []), session]);
  }
  return Array.from({ length: 42 }, (_, index) => {
    const day = addSeoulSessionDays(gridStart, index);
    return { day, inMonth: getMonthKey(day) === month, sessions: (sessionsByDay.get(day) ?? []).sort((a, b) => a.startAt.localeCompare(b.startAt)) };
  });
}
