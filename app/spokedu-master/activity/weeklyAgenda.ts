import { addSeoulSessionDays, getSeoulSessionDay } from '../lib/sessionDateTime';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';

export function getScheduleWeekStart(day: string) {
  const weekday = new Date(`${day}T12:00:00+09:00`).getUTCDay();
  return addSeoulSessionDays(day, -(weekday === 0 ? 6 : weekday - 1));
}

export function getScheduleWeekDays(day: string) {
  const start = getScheduleWeekStart(day);
  return Array.from({ length: 7 }, (_, index) => addSeoulSessionDays(start, index));
}

export function getScheduleAction(session: MasterSessionDto, classItem?: MasterClassDto | null) {
  const state = deriveMasterSessionWorkState(session, classItem);
  if (session.status === 'completed') return { label: '완료', actionable: false, state };
  if (session.status === 'cancelled') return { label: '취소', actionable: false, state };
  if (state.stage === 'ready-to-wrap') return { label: '수업 마무리하기', actionable: true, state };
  if (session.startedAt || state.progress.completed > 0) return { label: '수업 계속하기', actionable: true, state };
  return { label: '수업 준비하기', actionable: true, state };
}

export function buildWeeklyAgenda(day: string, sessions: MasterSessionDto[]) {
  const days = getScheduleWeekDays(day);
  const daySet = new Set(days);
  const unique = [...new Map(sessions.map((session) => [session.id, session])).values()]
    .filter((session) => daySet.has(getSeoulSessionDay(session.startAt)))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  return days.map((agendaDay) => ({
    day: agendaDay,
    sessions: unique.filter((session) => getSeoulSessionDay(session.startAt) === agendaDay),
  }));
}
