export const MASTER_DURATION_TAGS = [
  { label: '5~10분', value: 10 },
  { label: '10~15분', value: 15 },
] as const;

export const MASTER_SPACE_TAGS = ['체육관', '교실'] as const;
export const MASTER_TARGET_TAGS = ['미취학', '초등학생 이상'] as const;

export function normalizeMasterDuration(value: number | string | null | undefined): 10 | 15 | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric <= 10 ? 10 : 15;
}

export function displayMasterDuration(value: number | string | null | undefined): string {
  const normalized = normalizeMasterDuration(value);
  if (normalized === 10) return '5~10분';
  if (normalized === 15) return '10~15분';
  return '';
}

export function normalizeMasterSpace(value: string | null | undefined): string {
  const text = (value ?? '').trim();
  if (!text) return '';
  if (/교실|작은|좁|복도|실내|소규모/.test(text)) return '교실';
  return '체육관';
}

export function normalizeMasterTarget(value: string | null | undefined): string {
  const text = (value ?? '').trim();
  if (!text) return '';
  if (/미취학|유아|유치/.test(text)) return '미취학';
  return '초등학생 이상';
}
