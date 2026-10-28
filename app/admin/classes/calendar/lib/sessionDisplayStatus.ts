/** Display only: elapsed time must not change stored completion/payroll data. */
export function sessionDisplayStatus(
  event: { status?: string | null; start: Date | string; end: Date | string },
  now: number,
): string {
  if (event.status === 'postponed') return '연기';
  if (event.status === 'cancelled' || event.status === 'deleted') return '취소';
  if (['finished', 'verified', 'completed'].includes(event.status ?? '')) return '완료';
  const end = new Date(event.end).getTime();
  const start = new Date(event.start).getTime();
  if (Number.isFinite(end) && now >= end) return '완료';
  if (Number.isFinite(start) && now >= start) return '진행중';
  return '예정';
}
