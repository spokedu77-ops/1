/** Dates in lesson plans follow the Korean schedule, independent of browser TZ. */
export function lessonPlanScheduleHeader(startAt: string, endAt?: string): string {
  const start = new Date(startAt);
  if (!Number.isFinite(start.getTime())) throw new Error('LESSON_PLAN_SESSION_DATE_INVALID');
  const kst = new Date(start.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.toISOString().slice(0, 10).replaceAll('-', '.');
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][kst.getUTCDay()];
  const startTime = kst.toISOString().slice(11, 16);
  const end = endAt ? new Date(endAt) : null;
  const endTime = end && Number.isFinite(end.getTime())
    ? new Date(end.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16) : '00:00';
  return `${day}.(${weekday}요일) ${startTime} ~ ${endTime}`;
}

/** Explicit copying preserves the body/round for the teacher to review. */
export function copyLessonPlanForSchedule(content: string, startAt: string, endAt?: string): string {
  return content.replace(
    /^(\s*)\d{4}[./-]\d{1,2}[./-]\d{1,2}\.?\s*(?:\([^\r\n)]*\))?\s*\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2}/,
    (_match, whitespace: string) => `${whitespace}${lessonPlanScheduleHeader(startAt, endAt)}`,
  );
}

export function lessonPlanWriteError(raw: string): { status: number; message: string } {
  if (raw.includes('LESSON_PLAN_DATE_MISMATCH')) return { status: 409, message: '수업안 첫 줄의 날짜가 실제 수업일과 다릅니다. 수업 날짜를 확인해 주세요.' };
  if (raw.includes('LESSON_PLAN_DATE_REQUIRED')) return { status: 400, message: '수업안 첫 줄에 실제 수업 날짜를 입력해 주세요. 예: 2026.11.10.(화요일)' };
  if (raw.includes('LESSON_PLAN_FORBIDDEN')) return { status: 403, message: '담당 강사가 변경되었습니다. 수업을 다시 열어 주세요.' };
  if (raw.includes('LESSON_PLAN_SESSION_NOT_FOUND')) return { status: 404, message: '수업을 찾을 수 없습니다. 일정을 새로고침해 주세요.' };
  if (raw.includes('LESSON_PLAN_STALE') || raw.includes('duplicate key')) return { status: 409, message: '수업안이나 일정이 변경되었습니다. 작성한 내용을 복사해 두고 수업을 다시 열어 주세요.' };
  return { status: 500, message: '수업안을 저장하지 못했습니다. 작성한 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.' };
}
