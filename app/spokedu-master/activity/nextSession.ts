import { addSeoulSessionDays, getSeoulSessionDay, toSeoulDateTimeInput } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

export type NextSessionDraft = { day: string; startTime: string; endTime: string; endDayOffset: 0 | 1 };

export function buildNextSessionDraft(sourceSession: MasterSessionDto): NextSessionDraft {
  const startInput = toSeoulDateTimeInput(sourceSession.startAt);
  const endInput = toSeoulDateTimeInput(sourceSession.endAt);
  return {
    day: addSeoulSessionDays(getSeoulSessionDay(sourceSession.startAt), 7),
    startTime: startInput.slice(11, 16),
    endTime: endInput.slice(11, 16),
    endDayOffset: getSeoulSessionDay(sourceSession.startAt) === getSeoulSessionDay(sourceSession.endAt) ? 0 : 1,
  };
}

export function buildNextSessionDateTimes(draft: NextSessionDraft) {
  const startAt = `${draft.day}T${draft.startTime}`;
  const endDay = draft.endDayOffset === 1 || draft.endTime <= draft.startTime
    ? addSeoulSessionDays(draft.day, 1)
    : draft.day;
  return { startAt, endAt: `${endDay}T${draft.endTime}` };
}
