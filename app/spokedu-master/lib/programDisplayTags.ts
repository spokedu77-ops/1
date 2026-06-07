export const MASTER_DURATION_TAGS = [
  { label: '5~10분', value: 10 },
  { label: '10~15분', value: 15 },
] as const;

export const MASTER_SPACE_TAGS = ['체육관', '교실'] as const;
export const MASTER_TARGET_TAGS = ['미취학', '초등학생 이상'] as const;

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function splitStoredTags(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/[,|/·\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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

export function parseMasterSpaces(value: string | null | undefined): string[] {
  const text = (value ?? '').trim();
  if (!text || /확인 필요|미정|undefined|null/i.test(text)) return [];
  const parts = splitStoredTags(text);
  const spaces = parts.flatMap((part) => {
    if (/^ALL$/i.test(part)) return ['체육관', '교실'];
    const values: string[] = [];
    if (/체육관|운동장|넓은 공간/.test(part)) values.push('체육관');
    if (/교실|작은|좁|복도|실내|소규모/.test(part)) values.push('교실');
    return values;
  });
  return unique(spaces);
}

export function normalizeMasterSpace(value: string | null | undefined): string {
  return parseMasterSpaces(value).join(',');
}

export function hasMasterSpace(value: string | null | undefined, space: string): boolean {
  return parseMasterSpaces(value).includes(space);
}

export function parseMasterTargets(value: string | null | undefined): string[] {
  const text = (value ?? '').trim();
  if (!text || /확인 필요|미정|undefined|null/i.test(text)) return [];
  const parts = splitStoredTags(text);
  const targets = parts.flatMap((part) => {
    if (/^ALL$/i.test(part)) return ['미취학', '초등학생 이상'];
    const values: string[] = [];
    if (/미취학|유아|유치/.test(part)) values.push('미취학');
    if (/초등|중등|고등|청소년|전 학년|ALL/i.test(part)) values.push('초등학생 이상');
    return values;
  });
  return unique(targets);
}

export function normalizeMasterTarget(value: string | null | undefined): string {
  return parseMasterTargets(value).join(',');
}

export function hasMasterTarget(value: string | null | undefined, target: string): boolean {
  return parseMasterTargets(value).includes(target);
}

export function serializeMasterTags(values: string[]): string {
  return unique(values.map((item) => item.trim()).filter(Boolean)).join(',');
}
