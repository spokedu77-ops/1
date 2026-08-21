import type { ClassRecord } from '../types';

export function selectLatestApplicationIdea(
  records: ClassRecord[],
  programId: string,
): ClassRecord | null {
  return records
    .filter((record) => record.programId === programId && Boolean(record.applicationIdea?.trim()))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0] ?? null;
}
