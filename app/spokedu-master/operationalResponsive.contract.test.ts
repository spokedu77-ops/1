import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('operational responsive contract', () => {
  it('limits mobile tab-bar clearance to the mobile shell family', () => {
    for (const path of [
      'app/spokedu-master/classes/page.tsx',
      'app/spokedu-master/classes/[classId]/page.tsx',
      'app/spokedu-master/students/page.tsx',
      'app/spokedu-master/students/[studentId]/page.tsx',
    ]) {
      const source = read(path);
      expect(source).toContain('pb-28 md:pb-8');
      expect(source).not.toContain('pb-28 lg:pb-8');
    }
  });

  it('uses the responsive attendance grammar without a dead mobile action', () => {
    const detail = read('app/spokedu-master/classes/[classId]/page.tsx');
    const attendance = read('app/spokedu-master/manage/AttendanceProjectionTable.tsx');
    expect(detail).toContain('presentation="manage-responsive"');
    expect(attendance).toContain('onSessionSelect ? <button');
    expect(attendance).toContain('href={`/spokedu-lab/activity?session=${encodeURIComponent(selectedSession.id)}`}');
  });

  it('keeps membership controls touchable and mobile-first', () => {
    const students = read('app/spokedu-master/students/page.tsx');
    expect(students).toContain('grid gap-2 md:grid-cols-2');
    expect(students).toContain('flex min-h-11 items-center');
    expect(students).not.toContain('min-h-10 items-center gap-2');
  });

  it('makes nested roster confirmation modal and inerts its parent', () => {
    const roster = read('app/spokedu-master/classes/[classId]/ClassRosterSheet.tsx');
    expect(roster).toContain('inert={Boolean(pendingRemove)}');
    expect(roster).toContain('<BottomSheet open nested title={MASTER_ACTION_COPY.removeFromClass}');
  });
});
