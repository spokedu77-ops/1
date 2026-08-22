export const SESSION_TIME_ZONE = 'Asia/Seoul';

export function toSeoulDateTimeInput(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SESSION_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
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
