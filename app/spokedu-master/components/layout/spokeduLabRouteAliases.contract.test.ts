import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CORE_ROUTE_ALIASES = [
  ['dashboard/page.tsx', '../../spokedu-master/dashboard/page'],
  ['library/page.tsx', '../../spokedu-master/library/page'],
  ['class-tools/page.tsx', '../../spokedu-master/class-tools/page'],
  ['manage/page.tsx', '../../spokedu-master/manage/page'],
  ['classes/page.tsx', '../../spokedu-master/classes/page'],
  ['students/page.tsx', '../../spokedu-master/students/page'],
  ['class-record/page.tsx', '../../spokedu-master/class-record/page'],
  ['report/page.tsx', '../../spokedu-master/report/page'],
  ['spomove/page.tsx', '../../spokedu-master/spomove/page'],
] as const;

describe('SPOKEDU LAB core route aliases', () => {
  it('keeps protected LAB navigation in one App Router layout', () => {
    const layout = readFileSync(join(process.cwd(), 'app/spokedu-lab/layout.tsx'), 'utf8');
    expect(layout).toContain("export { default } from '../spokedu-master/layout'");

    for (const [pathname, canonicalModule] of CORE_ROUTE_ALIASES) {
      const source = readFileSync(join(process.cwd(), 'app/spokedu-lab', pathname), 'utf8');
      expect(source).toContain(`export { default } from '${canonicalModule}'`);
    }
  });
});
