import type { EditableSession, TeacherInput } from '@/app/admin/classes-shared/types';

export type CreateSession = EditableSession & { assistants: TeacherInput[] };
export type DaySchedule = {
  startTime: string;
  durationMinutes: string;
  teacherId: string;
  price: number;
  assistants: TeacherInput[];
};
export type CreateScheduleForm = {
  title: string; type: string; startDate: string; startTime: string;
  durationMinutes: string; teacherId: string; price: number;
  weeklyFrequency: number; daysOfWeek: number[]; sessionCount: number; roundWeight: number;
  repeatOnce?: boolean;
};

export const MONDAY_FIRST_DAYS = [1, 2, 3, 4, 5, 6, 0];
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
export function localDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function daySettings(form: CreateScheduleForm, overrides: Record<number, DaySchedule>, day: number): DaySchedule {
  return overrides[day] ?? { startTime: form.startTime, durationMinutes: form.durationMinutes, teacherId: form.teacherId, price: form.price, assistants: [] };
}
export function buildCreateSchedule(form: CreateScheduleForm, overrides: Record<number, DaySchedule>): CreateSession[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) return [];
  const cursor = new Date(`${form.startDate}T00:00:00`);
  if (!Number.isFinite(cursor.getTime())) return [];
  const single = form.repeatOnce || form.type === 'one_day_private' || form.type === 'one_day_center';
  const count = single ? 1 : form.sessionCount;
  if (!Number.isInteger(count) || count < 1 || count > 500) return [];
  const days = single ? [cursor.getDay()] : form.daysOfWeek;
  if (!days.length) return [];
  const sessions: CreateSession[] = [];
  while (sessions.length < count) {
    if (days.includes(cursor.getDay())) {
      const config = daySettings(form, overrides, cursor.getDay());
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(config.startTime) || !(Number(config.durationMinutes) > 0)) return [];
      const [hours, minutes] = config.startTime.split(':').map(Number);
      const startAt = new Date(cursor);
      startAt.setHours(hours!, minutes!, 0, 0);
      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + Number(config.durationMinutes));
      sessions.push({ roundIndex: sessions.length + 1, startAt, endAt, teacherId: config.teacherId, price: config.price, assistants: config.assistants.map((teacher) => ({ ...teacher })) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}

export function scheduleValidation(sessions: CreateSession[]): string | null {
  if (!sessions.length) return '첫 수업일, 요일, 시간과 총 회차(1~500회)를 확인해 주세요.';
  for (const session of sessions) {
    if (!session.teacherId) return `${session.roundIndex}회차 메인강사를 선택해 주세요.`;
    if (!Number.isFinite(session.startAt.getTime()) || !Number.isFinite(session.endAt.getTime()) || session.endAt <= session.startAt) return `${session.roundIndex}회차 시간을 확인해 주세요.`;
    const ids = [session.teacherId, ...session.assistants.map((teacher) => teacher.id)];
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return `${session.roundIndex}회차 메인·보조강사를 중복 없이 선택해 주세요.`;
    if ([session.price, ...session.assistants.map((teacher) => teacher.price)].some((price) => !Number.isFinite(price) || price < 0)) return `${session.roundIndex}회차 수업료를 확인해 주세요.`;
  }
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i]!; const b = sessions[j]!;
      if (a.startAt >= b.endAt || b.startAt >= a.endAt) continue;
      const aIds = new Set([a.teacherId, ...a.assistants.map((teacher) => teacher.id)]);
      if ([b.teacherId, ...b.assistants.map((teacher) => teacher.id)].some((id) => aIds.has(id))) return `${a.roundIndex}회차와 ${b.roundIndex}회차의 강사 일정이 겹칩니다.`;
    }
  }
  return null;
}
