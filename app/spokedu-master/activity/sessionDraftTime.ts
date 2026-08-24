import { addSeoulSessionDays } from '../lib/sessionDateTime';

export type SessionTimeDraft = {
  day: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

const MINUTES_PER_DAY = 24 * 60;

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToTime(value: number) {
  const normalized = ((value % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function createSessionTimeDraft(day: string, startTime = '10:00', durationMinutes = 60): SessionTimeDraft {
  return { day, startTime, endTime: minutesToTime(timeToMinutes(startTime) + durationMinutes), durationMinutes };
}

export function changeSessionStart(draft: SessionTimeDraft, startTime: string): SessionTimeDraft {
  return { ...draft, startTime, endTime: minutesToTime(timeToMinutes(startTime) + draft.durationMinutes) };
}

export function changeSessionEnd(draft: SessionTimeDraft, endTime: string): SessionTimeDraft {
  const start = timeToMinutes(draft.startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) end += MINUTES_PER_DAY;
  return { ...draft, endTime, durationMinutes: end - start };
}

export function sessionTimeDraftToInputs(draft: SessionTimeDraft) {
  const crossesMidnight = timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime);
  return {
    startAt: `${draft.day}T${draft.startTime}`,
    endAt: `${crossesMidnight ? addSeoulSessionDays(draft.day, 1) : draft.day}T${draft.endTime}`,
  };
}
