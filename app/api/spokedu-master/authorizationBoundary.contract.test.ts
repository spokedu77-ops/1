import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER direct API authorization boundaries', () => {
  it.each([
    ['app/api/spokedu-master/classes/route.ts', 'attendance'],
    ['app/api/spokedu-master/students/route.ts', 'attendance'],
    ['app/api/spokedu-master/sessions/route.ts', 'attendance'],
    ['app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts', 'attendance'],
    ['app/api/spokedu-master/class-records/route.ts', 'records'],
    ['app/api/spokedu-master/session-captures/route.ts', 'records'],
    ['app/api/spokedu-master/explanations/route.ts', 'records'],
    ['app/api/spokedu-master/sessions/[sessionId]/parent-notice/route.ts', 'records'],
    ['app/api/spokedu-master/favorites/route.ts', 'library'],
    ['app/api/spokedu-master/program-favorites/route.ts', 'library'],
    ['app/api/spokedu-master/spomove/guide-video/route.ts', 'spomove'],
  ])('%s enforces the %s server capability', (path, capability) => {
    expect(read(path)).toContain(`requireSpokeduMasterCapability('${capability}')`);
  });

  it.each([
    'app/api/spokedu-master/classes/route.ts',
    'app/api/spokedu-master/students/route.ts',
    'app/api/spokedu-master/sessions/route.ts',
    'app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts',
    'app/api/spokedu-master/class-records/route.ts',
    'app/api/spokedu-master/session-captures/route.ts',
    'app/api/spokedu-master/explanations/route.ts',
    'app/api/spokedu-master/favorites/route.ts',
    'app/api/spokedu-master/program-favorites/route.ts',
  ])('%s scopes persistence to the authenticated owner', (path) => {
    const source = read(path);
    expect(source).toContain('access.userId');
    expect(source).toMatch(/owner_id|p_owner_id/);
  });

  it('requires Premium before a SPOMOVE activity write', () => {
    const source = read('app/api/spokedu-master/sessions/[sessionId]/programs/route.ts');
    expect(source).toContain("requireSpokeduMasterCapability('attendance')");
    expect(source).toContain("requireSpokeduMasterCapability('spomove')");
    expect(source.indexOf("requireSpokeduMasterCapability('spomove')"))
      .toBeLessThan(source.indexOf('spokedu_master_add_session_spomove'));
  });
});
