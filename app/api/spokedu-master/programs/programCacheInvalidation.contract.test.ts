import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const writeRoutes = [
  'app/api/spokedu-master/programs/route.ts',
  'app/api/admin/curriculum/route.ts',
  'app/api/admin/spokedu-master/programs/route.ts',
  'app/api/admin/spokedu-master/programs/home-featured/route.ts',
  'app/api/admin/spokedu-master/programs/sync-center/route.ts',
  'app/api/admin/spokedu-master/programs/seed-reference-videos/route.ts',
  'app/api/admin/spokedu-master/storage/recompress/route.ts',
];

describe('P2-2 program cache invalidation contract', () => {
  it('invalidates shared program source cache after server write paths', () => {
    for (const file of writeRoutes) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source, file).toContain('invalidateSpokeduMasterProgramSourceCache');
    }
  });

  it('does not call updateTag from route handlers', () => {
    for (const file of writeRoutes) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source, file).not.toContain('updateTag');
    }
  });
});
