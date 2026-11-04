import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MASTER_PRODUCT_CATALOG } from './productCatalog';
import { getMasterRouteRequirement } from '../components/layout/masterRouteAccess';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER commercial cohesion contracts', () => {
  it('keeps general teaching management in Lite and SPOMOVE in Premium', () => {
    expect(getMasterRouteRequirement('/spokedu-master/activity').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/classes/class-a').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/students').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/students/student-a').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/report').capability).toBe('records');
    expect(MASTER_PRODUCT_CATALOG.lite.featureEntitlements).toMatchObject({
      canUseAttendance: true,
      canUseRecords: true,
      canUseSpomove: false,
    });
  });

  it('aligns operational and library APIs to the same capability names as UI gates', () => {
    expect(read('app/api/spokedu-master/sessions/route.ts')).toContain("requireSpokeduMasterCapability('attendance')");
    expect(read('app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts')).toContain(
      "requireSpokeduMasterCapability('attendance')",
    );
    expect(read('app/api/spokedu-master/program-favorites/route.ts')).toContain(
      "requireSpokeduMasterCapability('library')",
    );
    expect(read('app/api/spokedu-master/programs/programCatalogHandlers.ts')).toContain(
      "requireSpokeduMasterCapability('libraryBrowse')",
    );
    expect(read('app/api/spokedu-master/explanations/route.ts')).toContain(
      "requireSpokeduMasterCapability('records')",
    );
  });
});
