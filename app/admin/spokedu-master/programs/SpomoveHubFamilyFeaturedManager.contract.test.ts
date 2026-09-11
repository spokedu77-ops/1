import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/admin/spokedu-master/programs/SpomoveHubFamilyFeaturedManager.tsx'),
  'utf8',
);

describe('admin SPOMOVE hub family featured labels', () => {
  it('uses the shared public display model and does not expose order management', () => {
    expect(source).toContain('getSpomovePresetDisplayModel');
    expect(source).toContain('display.displayTitle');
    expect(source).toContain('허브 테마 대표 관리');
    expect(source).toContain('SPOMOVE_CATALOG_FAMILIES');
    expect(source).not.toContain('순서관리');
    expect(source).not.toContain('정렬 순서');
  });
});
