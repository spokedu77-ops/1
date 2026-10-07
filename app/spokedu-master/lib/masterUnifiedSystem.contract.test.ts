import { describe, expect, it } from 'vitest';
import {
  buildActivitySessionHref,
  parseMasterWorkReturnHref,
  readSpomoveSessionOrigin,
  resolveMasterContextQueryKeys,
} from './masterNavigationContext';
import { getSafeMasterPostPaymentPath } from './masterPaymentReturn';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

describe('MASTER unified navigation context', () => {
  it('PAY-01 keeps Hub discovery filters on payment return', () => {
    expect(resolveMasterContextQueryKeys('/spokedu-lab/spomove')).toEqual([
      'view',
      'group',
      'difficulty',
      'movement',
      'q',
      'session',
      'returnTo',
      'source',
    ]);
    expect(
      getSafeMasterPostPaymentPath('/spokedu-lab/spomove?group=dive&difficulty=hard&q=reaction'),
    ).toBe('/spokedu-lab/spomove?group=dive&difficulty=hard&q=reaction');
  });

  it('PAY-02 / SYS-03 keep Session SPOMOVE origin through payment and launch href', () => {
    expect(resolveMasterContextQueryKeys('/spokedu-lab/spomove/session')).toContain('hubReturn');
    expect(resolveMasterContextQueryKeys('/spokedu-lab/spomove/session')).toContain('returnTo');
    expect(resolveMasterContextQueryKeys('/spokedu-lab/spomove/session')).toContain('session');
    const activity = readSessionDetailSource();
    expect(activity).toContain('buildManageSessionHref(activeSession.id)');
    expect(activity).toContain('session: activeSession.id');
    expect(activity).toContain('sessionProgram: program.id');
  });

  it('resolves Session origin return ahead of Hub exploration', () => {
    expect(
      parseMasterWorkReturnHref(
        '/spokedu-lab/activity?session=abc',
        '/spokedu-lab/spomove?group=stroop',
      ),
    ).toBe('/spokedu-lab/activity?session=abc');
    expect(buildActivitySessionHref('sess-9')).toBe('/spokedu-lab/activity?session=sess-9');
    expect(readSpomoveSessionOrigin(new URLSearchParams('session=s1&sessionProgram=p1')).isSessionOrigin).toBe(true);
  });
});
