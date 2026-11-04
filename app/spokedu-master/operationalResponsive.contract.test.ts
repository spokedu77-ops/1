import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('operational responsive contract', () => {
  it('uses the responsive attendance grammar without a dead mobile action', () => {
    const detail = read('app/spokedu-master/classes/[classId]/page.tsx');
    const attendance = read('app/spokedu-master/manage/AttendanceProjectionTable.tsx');
    expect(detail).toContain('presentation="manage-responsive"');
    expect(attendance).toContain('onSessionSelect ? <button');
    expect(attendance).toContain('href={`/spokedu-lab/activity?session=${encodeURIComponent(selectedSession.id)}`}');
  });

  it('makes nested roster confirmation modal and inerts its parent', () => {
    const roster = read('app/spokedu-master/classes/[classId]/ClassRosterSheet.tsx');
    expect(roster).toContain('inert={Boolean(pendingRemove)}');
    expect(roster).toContain('<BottomSheet open nested title={MASTER_ACTION_COPY.removeFromClass}');
  });
});
