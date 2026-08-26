import { seoulDateTimeInputToIso } from './sessionDateTime';

export type MasterScheduleCadence = 'weekly' | 'biweekly';
export type MasterScheduleRule = {
  id: string; classId: string; cadence: MasterScheduleCadence; weekday: number; startTime: string;
  durationMinutes: number; startsOn: string; endsOn: string | null; occurrenceLimit: number | null;
  active: boolean; createdAt: string; updatedAt: string;
};
export type ScheduleOccurrencePreview = { startAt: string; endAt: string; day: string };

export function buildScheduleOccurrencePreview(input: {
  cadence: MasterScheduleCadence; weekday: number; startTime: string; startsOn: string; count: number;
  durationMinutes: number; endsOn?: string | null;
}): ScheduleOccurrencePreview[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn) || !/^\d{2}:\d{2}$/.test(input.startTime)
    || input.weekday < 0 || input.weekday > 6 || input.count < 1 || input.count > 12) return [];
  const start = new Date(`${input.startsOn}T12:00:00+09:00`);
  const delta = (input.weekday - start.getDay() + 7) % 7;
  start.setDate(start.getDate() + delta);
  const step = input.cadence === 'biweekly' ? 14 : 7;
  const result: ScheduleOccurrencePreview[] = [];
  for (let index = 0; index < input.count; index += 1) {
    const date = new Date(start); date.setDate(start.getDate() + index * step);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    if (input.endsOn && day > input.endsOn) break;
    const startAt = seoulDateTimeInputToIso(`${day}T${input.startTime}`);
    const endAt = new Date(new Date(startAt).getTime() + input.durationMinutes * 60_000).toISOString();
    result.push({ day, startAt, endAt });
  }
  return result;
}

export function occurrenceOverlaps(startAt: string, endAt: string, sessions: Array<{ startAt: string; endAt: string; status: string }>) {
  const start = new Date(startAt).getTime(); const end = new Date(endAt).getTime();
  return sessions.some((session) => session.status !== 'cancelled' && new Date(session.startAt).getTime() < end && new Date(session.endAt).getTime() > start);
}
