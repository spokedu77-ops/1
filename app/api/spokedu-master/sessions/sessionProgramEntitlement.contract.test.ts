import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('app/api/spokedu-master/sessions/[sessionId]/programs/route.ts', 'utf8');
const sessionsRoute = readFileSync('app/api/spokedu-master/sessions/route.ts', 'utf8');
const picker = readFileSync('app/spokedu-master/manage/SessionActivityPicker.tsx', 'utf8');

describe('session program entitlement boundary', () => {
  it('requires attendance for all assignments and SPOMOVE capability for SPOMOVE assignments', () => {
    expect(route).toContain("requireSpokeduMasterCapability('attendance')");
    expect(route).toContain("if (sourceType === 'spomove')");
    expect(route).toContain("requireSpokeduMasterCapability('spomove')");
    expect(route.indexOf("requireSpokeduMasterCapability('spomove')"))
      .toBeLessThan(route.indexOf("spokedu_master_add_session_spomove"));
  });

  it('also blocks creating a Session with embedded SPOMOVE activities', () => {
    expect(sessionsRoute).toContain("input.programs?.some((item) => item.sourceType === 'spomove')");
    expect(sessionsRoute).toContain("requireSpokeduMasterCapability('spomove')");
  });

  it('does not expose the SPOMOVE picker tab without SPOMOVE entitlement', () => {
    expect(picker).toContain('canUseSpomove ?');
    expect(picker).toContain("['spomove'] as const");
  });
});
