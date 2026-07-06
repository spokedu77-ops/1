import { COLORS } from '../constants';

export type SpomoveMemoryColorId = 'red' | 'yellow' | 'green' | 'blue';

export const SPOMOVE_MEMORY_COLOR_ORDER: SpomoveMemoryColorId[] = ['red', 'yellow', 'green', 'blue'];

export const SPOMOVE_MEMORY_COLOR_SHORT: Record<SpomoveMemoryColorId, string> = {
  red: '빨',
  yellow: '노',
  green: '초',
  blue: '파',
};

export const SPOMOVE_MEMORY_SLOT_COUNT = 10;

export const DEFAULT_MEMORY_COLOR_SLOTS: SpomoveMemoryColorId[] = [
  'red',
  'yellow',
  'green',
  'blue',
  'red',
  'yellow',
  'green',
  'blue',
  'red',
  'yellow',
];

type ColorItem = (typeof COLORS)[number];

export function isSpomoveMemoryColorId(v: unknown): v is SpomoveMemoryColorId {
  return v === 'red' || v === 'yellow' || v === 'green' || v === 'blue';
}

export function normalizeMemoryColorSlots(raw: unknown): SpomoveMemoryColorId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_MEMORY_COLOR_SLOTS];
  const out: SpomoveMemoryColorId[] = [];
  for (let i = 0; i < SPOMOVE_MEMORY_SLOT_COUNT; i++) {
    const v = raw[i];
    out.push(isSpomoveMemoryColorId(v) ? v : DEFAULT_MEMORY_COLOR_SLOTS[i]!);
  }
  return out;
}

export function memoryColorItemById(id: string): ColorItem {
  return COLORS.find((c) => c.id === id) ?? COLORS[0]!;
}

/** 선생님이 지정한 1~10번 슬롯 색상 → 순차 기억 패턴 */
export function buildMemoryPatternFromSlots(slotIds: readonly string[]): ColorItem[] {
  return slotIds.slice(0, SPOMOVE_MEMORY_SLOT_COUNT).map((id) => memoryColorItemById(id));
}
