import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SESSION_DETAIL_SOURCE_FILES = [
  'manage/SessionDetailSheet.tsx',
  'manage/session-detail/SessionDetailSheet.tsx',
  'manage/session-detail/SessionInformation.tsx',
  'manage/session-detail/SessionActivities.tsx',
  'manage/session-detail/SessionAttendance.tsx',
  'manage/session-detail/SessionMemo.tsx',
  'manage/session-detail/SessionActions.tsx',
  'manage/session-detail/useSessionDraft.ts',
  'manage/session-detail/useSessionSchedule.ts',
  'manage/session-detail/useSessionActivities.ts',
  'manage/session-detail/useSessionAttendance.ts',
] as const;

export function readSessionDetailSource() {
  return SESSION_DETAIL_SOURCE_FILES
    .map((path) => readFileSync(join(process.cwd(), 'app/spokedu-master', path), 'utf8'))
    .join('\n');
}
