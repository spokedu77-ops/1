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

  it('builds SPOMOVE payment href from next as the single resource source', () => {
    const context = buildMasterGateContext({
      capability: 'spomove',
      pathname: '/spokedu-master/spomove/session',
      currentPath: '/spokedu-master/spomove/session?preset=simon-basic&mode=projector&sound=on&entry=start',
      journeyId: 'j2',
    });

    expect(context?.resource.kind).toBe('preset');
    expect(buildMasterPaymentHref(context!)).toBe(
      '/spokedu-master/payment?plan=premium&intent=start_spomove&next=%2Fspokedu-master%2Fspomove%2Fsession%3Fpreset%3Dsimon-basic%26mode%3Dprojector%26sound%3Don%26entry%3Dstart&journeyId=j2&gateSurface=spomove_session',
    );
  });

  it('reads payment context while sanitizing unsafe next values', () => {
    const params = new URLSearchParams({
      intent: 'continue_record',
      next: '/spokedu-master/payment/success?next=/spokedu-master/report',
      journeyId: 'j3',
    });
    expect(readMasterGateContextFromSearchParams(params)).toMatchObject({
      intent: 'continue_record',
      next: '/spokedu-master/class-record',
      journeyId: 'j3',
    });
  });
});

