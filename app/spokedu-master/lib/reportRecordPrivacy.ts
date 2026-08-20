import type { ClassRecord } from '../types';

/** Private teacher lesson notes are never valid parent-report source records. */
export function isParentReportRecordEligible(record: Pick<ClassRecord, 'recordType'>): boolean {
  return record.recordType !== 'lesson_note';
}
