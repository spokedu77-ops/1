import holidayData from '../../../../data/kr-public-holidays.json';

export type HolidayPosture = 'holiday' | 'weekday' | 'unknown';

const coverageYears = new Set(Object.keys(holidayData.years).map((y) => Number(y)));

const holidayDates = new Set<string>();
for (const rows of Object.values(holidayData.years)) {
  for (const row of rows) holidayDates.add(row.date);
}

export function seoulLocalDateIso(sessionStartAt: string | null | undefined): string | null {
  if (!sessionStartAt) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(sessionStartAt));
}

export function krPublicHolidayPosture(sessionStartAt: string | null | undefined): HolidayPosture {
  const local = seoulLocalDateIso(sessionStartAt);
  if (!local) return 'unknown';
  const year = Number(local.slice(0, 4));
  if (!coverageYears.has(year)) return 'unknown';
  return holidayDates.has(local) ? 'holiday' : 'weekday';
}

export function blocksPostponeCredit(sessionStartAt: string | null | undefined): boolean {
  const posture = krPublicHolidayPosture(sessionStartAt);
  return posture === 'holiday' || posture === 'unknown';
}

const POSTPONE_CREDIT_LABELS = new Set(['수업 연기', '당일 연기']);

/** UI 표시용: 공휴일·미확인 연도면 연기 가산 항목 0P */
export function mileageActionDisplayPoints(
  label: string,
  basePoints: number,
  sessionStartAt: string | null | undefined,
): number {
  if (!POSTPONE_CREDIT_LABELS.has(label)) return basePoints;
  if (blocksPostponeCredit(sessionStartAt)) return 0;
  return basePoints;
}

export function sumMileageActionPoints(
  actionCsv: string,
  sessionStartAt: string | null | undefined,
  catalog: { label: string; val: number }[],
): number {
  const byLabel = new Map(catalog.map((row) => [row.label, row.val]));
  let total = 0;
  for (const raw of actionCsv.split(',')) {
    const label = raw.trim();
    if (!label) continue;
    const base = byLabel.get(label);
    if (base === undefined) continue;
    total += mileageActionDisplayPoints(label, base, sessionStartAt);
  }
  return total;
}
