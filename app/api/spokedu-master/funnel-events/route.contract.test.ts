import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('app/api/spokedu-master/funnel-events/route.ts', 'utf8');
const helper = readFileSync('app/lib/server/spokeduMasterFunnel.ts', 'utf8');

describe('MASTER funnel event route contract', () => {
  it('keeps public collection aggregate-only and authenticates every product event', () => {
    expect(route).toContain("name !== 'landing_visit'");
    expect(route).toContain('requireSpokeduMasterSession()');
    expect(route).toContain('userId = session.userId');
  });

  it('accepts only an explicit low-cardinality context allowlist', () => {
    expect(route).toContain("new Set(['surface', 'plan', 'program_id'])");
    expect(route).not.toContain('paymentKey');
    expect(route).not.toContain('billingKey');
    expect(route).not.toContain('email');
  });

  it('derives identity and idempotency on the server', () => {
    expect(helper).toContain("route: 'master'");
    expect(helper).toContain('buildMasterFunnelEventKey');
    expect(helper).toContain("onConflict: 'event_key'");
  });
});
