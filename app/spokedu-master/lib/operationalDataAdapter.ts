import type {
  MasterStudentMeta,
} from '../types/operational';

export function studentMetaToDisplay(meta: MasterStudentMeta): string {
  if (typeof meta === 'string') return meta;
  const values = Object.values(meta).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return values.join(' / ');
}
