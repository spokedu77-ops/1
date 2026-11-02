/** Calendar boundaries are always Korean time, independent of server/browser TZ. */
export function sessionKstDay(value: string | number | Date): string {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(ms)) throw new Error('SESSION_DATE_INVALID');
  return new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isFutureSessionDay(startAt: string, now: Date = new Date()): boolean {
  return sessionKstDay(startAt) > sessionKstDay(now);
}

type RecordedSession = {
  start_at: string;
  status?: string | null;
  feedback_fields?: unknown;
  students_text?: string | null;
  photo_url?: unknown;
  file_url?: unknown;
};

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (value && typeof value === 'object') return Object.values(value).some(hasValue);
  return typeof value === 'number' || value === true;
}

export function hasSessionFeedback(session: RecordedSession): boolean {
  return hasValue(session.feedback_fields) || hasValue(session.photo_url) || hasValue(session.file_url)
    // Legacy students_text also holds assistant metadata; metadata alone is not feedback.
    || /✅\s*(오늘 수업|강점|개선|다음 수업|특이사항)/.test(session.students_text ?? '');
}

/** Keep existing teaching history attached to its actual day; never silently erase it. */
export function assertSessionSchedulePreservesFeedback(
  session: RecordedSession,
  nextStartAt: string | undefined,
  now: Date = new Date(),
): void {
  if (!nextStartAt) return;
  const nextDay = sessionKstDay(nextStartAt);
  if (nextDay < sessionKstDay(now) || nextDay === sessionKstDay(session.start_at)) return;
  if (hasSessionFeedback(session) || session.status === 'finished' || session.status === 'verified') {
    throw new Error('SESSION_RECORDED_SCHEDULE_MOVE_FORBIDDEN');
  }
}
