import { describe, expect, it } from 'vitest';
import {
  buildMasterGateContext,
  buildMasterPaymentHref,
  readMasterGateContextFromSearchParams,
  resolveMasterIntentAccessPlan,
} from './masterGateIntent';

describe('master gate intent model', () => {
  it('maps intent to minimum plan without blocking Premium on library intent', () => {
    expect(resolveMasterIntentAccessPlan('open_library')).toEqual({
      minimumPlan: 'lite',
      allowedPlans: ['lite', 'premium'],
    });
    expect(resolveMasterIntentAccessPlan('start_spomove')).toEqual({
      minimumPlan: 'premium',
      allowedPlans: ['premium'],
    });
  });

  it('builds a library gate context from the current route', () => {
    const context = buildMasterGateContext({
      capability: 'library',
      pathname: '/spokedu-master/library/funstick-fencing',
      currentPath: '/spokedu-master/library/funstick-fencing?from=dashboard&plan=premium',
      journeyId: 'j1',
    });

    expect(context).toMatchObject({
      intent: 'open_library',
      minimumPlan: 'lite',
      next: '/spokedu-master/library/funstick-fencing?from=dashboard',
      journeyId: 'j1',
      gateSurface: 'library_detail',
      resource: { kind: 'program', id: 'funstick-fencing' },
    });
  });

  it('builds SPOMOVE payment href with a canonical next and direct resource context', () => {
    const context = buildMasterGateContext({
      capability: 'spomove',
      pathname: '/spokedu-master/spomove/session',
      currentPath: '/spokedu-master/spomove/session?preset=simon-basic&mode=projector&sound=on&entry=start',
      journeyId: 'j2',
    });

    expect(context?.resource.kind).toBe('preset');
    const payment = new URL(buildMasterPaymentHref(context!), 'https://spokedu.local');
    expect(payment.searchParams.get('next')).toBe(
      '/spokedu-master/spomove/session?preset=simon-basic&mode=projector&sound=on&entry=start',
    );
    expect(payment.searchParams.get('preset')).toBe('simon-basic');
    expect(payment.searchParams.get('journeyId')).toBe('j2');
  });

  it('reads payment context while sanitizing unsafe next values', () => {
    const params = new URLSearchParams({
      intent: 'continue_record',
      next: '/spokedu-master/payment/success?next=/spokedu-master/report',
      journeyId: 'j3',
    });
    expect(readMasterGateContextFromSearchParams(params)).toMatchObject({
      mode: 'gated',
      intent: 'continue_record',
      next: '/spokedu-master/class-record',
      journeyId: 'j3',
    });
  });

  it('treats payment without an intent as direct checkout', () => {
    expect(readMasterGateContextFromSearchParams(new URLSearchParams())).toMatchObject({
      mode: 'direct',
      intent: null,
      minimumPlan: 'lite',
      allowedPlans: ['lite', 'premium'],
      next: '/spokedu-master/dashboard',
    });

    expect(readMasterGateContextFromSearchParams(new URLSearchParams('plan=lite'))).toMatchObject({
      mode: 'direct',
      intent: null,
      minimumPlan: 'lite',
      allowedPlans: ['lite', 'premium'],
    });
  });
});
