import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const API_ROOT = join(process.cwd(), 'app/api/spokedu-master');

/** Tables that must never leak across owners. */
const OWNER_SCOPED_ROUTE_MARKERS = [
  { file: 'students/route.ts', mustInclude: [".eq('owner_id', access.userId)"] },
  { file: 'students/[id]/route.ts', mustInclude: [".eq('owner_id', access.userId)"] },
  { file: 'class-records/route.ts', mustInclude: [".eq('owner_id', access.userId)"] },
  { file: 'explanations/route.ts', mustInclude: [".eq('owner_id', access.userId)"] },
  { file: 'program-favorites/route.ts', mustInclude: [".eq('owner_id', access.userId)"] },
  { file: 'favorites/route.ts', mustInclude: [".eq('owner_id', access.userId)"] },
  { file: 'operational-data/route.ts', mustInclude: ['p_owner_id'] },
] as const;

describe('SPOKEDU MASTER owner isolation (P4)', () => {
  it('keeps operational API routes scoped to access.userId', () => {
    for (const marker of OWNER_SCOPED_ROUTE_MARKERS) {
      const source = readFileSync(join(API_ROOT, marker.file), 'utf8');
      for (const needle of marker.mustInclude) {
        expect(source, `${marker.file} missing ${needle}`).toContain(needle);
      }
      expect(source).toMatch(/requireSpokeduMaster(Access|Capability|Session)/);
    }
  });

  it('keeps client draft and local workspace isolation tests in the suite', () => {
    const draft = readFileSync(join(process.cwd(), 'app/spokedu-master/lib/saveDraftStorage.test.ts'), 'utf8');
    const workspace = readFileSync(join(process.cwd(), 'app/spokedu-master/store/localWorkspace.test.ts'), 'utf8');
    expect(draft).toContain('scopes drafts by owner and does not leak across accounts');
    expect(workspace).toContain('local workspace owner isolation');
  });
});
