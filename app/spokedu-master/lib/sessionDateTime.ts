export const SESSION_TIME_ZONE = 'Asia/Seoul';

const SEOUL_DATETIME_INPUT_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: SESSION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const DYNAMIC_SEOUL_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const MAX_DYNAMIC_SEOUL_FORMATTERS = 32;

function getSeoulDateTimeFormatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  const cached = DYNAMIC_SEOUL_FORMATTER_CACHE.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('ko-KR', { ...options, timeZone: SESSION_TIME_ZONE });
  if (DYNAMIC_SEOUL_FORMATTER_CACHE.size >= MAX_DYNAMIC_SEOUL_FORMATTERS) {
    const firstKey = DYNAMIC_SEOUL_FORMATTER_CACHE.keys().next().value;
    if (firstKey) DYNAMIC_SEOUL_FORMATTER_CACHE.delete(firstKey);
  }
  DYNAMIC_SEOUL_FORMATTER_CACHE.set(key, formatter);
  return formatter;
}

export function toSeoulDateTimeInput(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = SEOUL_DATETIME_INPUT_FORMATTER.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function seoulDateTimeInputToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('올바른 날짜와 시간을 입력해 주세요.');
  return new Date(`${value}:00+09:00`).toISOString();
}

export function getSeoulSessionDay(value: Date | string) {
  return toSeoulDateTimeInput(value).slice(0, 10);
}

export function getSeoulToday() {
  return getSeoulSessionDay(new Date());
}

export function addSeoulSessionDays(day: string, amount: number) {
  const base = new Date(`${day}T12:00:00+09:00`);
  base.setUTCDate(base.getUTCDate() + amount);
  return getSeoulSessionDay(base);
}

export function seoulDayToDate(day: string) {
  return new Date(`${day}T00:00:00+09:00`);
}

export function formatSeoulSessionTime(value: Date | string) {
  return toSeoulDateTimeInput(value).slice(11, 16);
}

export function formatSeoulSessionDay(day: string, options: Intl.DateTimeFormatOptions) {
  return getSeoulDateTimeFormatter(options).format(seoulDayToDate(day));
}

export function buildSessionDraftDateTimes(initialDate: Date, existing?: { startAt: string; endAt: string }) {
  if (existing) return { startAt: toSeoulDateTimeInput(existing.startAt), endAt: toSeoulDateTimeInput(existing.endAt) };
  const startAt = `${getSeoulSessionDay(initialDate)}T10:00`;
  const endAt = toSeoulDateTimeInput(new Date(new Date(seoulDateTimeInputToIso(startAt)).getTime() + 60 * 60 * 1000));
  return { startAt, endAt };
}
