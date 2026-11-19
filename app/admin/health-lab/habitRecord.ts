import type { HabitLog } from './missionEngine';

export function habitIsBlank(log: HabitLog) {
  return log.vegetables == null && log.movementPlay == null && log.bedtime == null && log.wakeTime == null && log.mediaMinutes == null;
}

export function habitHeading(date: string, today: string) {
  if (date === today) return '오늘의 건강습관';
  const [, month = '', day = ''] = date.split('-');
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (!monthNumber || !dayNumber) return '건강습관';
  return `${monthNumber}월 ${dayNumber}일 건강습관`;
}

export function applyHabitDraft(logs: HabitLog[], draft: HabitLog, label: string) {
  const rest = logs.filter((item) => !(item.childId === draft.childId && item.date === draft.date));
  const existed = rest.length !== logs.length;
  if (habitIsBlank(draft)) {
    if (!existed) return { ok: false as const, habitLogs: logs, message: '네 영역이 모두 비어 있어 저장하지 않았습니다.' };
    return { ok: true as const, habitLogs: rest, message: `${label} 건강습관 기록을 지웠어요.` };
  }
  return { ok: true as const, habitLogs: [...rest, draft], message: `${label} 건강습관을 저장했어요.` };
}
