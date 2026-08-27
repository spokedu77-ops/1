import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildActivitySessionHref,
  parseMasterWorkReturnHref,
  readSpomoveSessionOrigin,
  resolveMasterContextQueryKeys,
} from './masterNavigationContext';
import { getSafeMasterPostPaymentPath } from './masterPaymentReturn';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER unified navigation context', () => {
  it('PAY-01 keeps Hub discovery filters on payment return', () => {
    expect(resolveMasterContextQueryKeys('/spokedu-master/spomove')).toEqual([
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
      getSafeMasterPostPaymentPath('/spokedu-master/spomove?group=dive&difficulty=hard&q=reaction'),
    ).toBe('/spokedu-master/spomove?group=dive&difficulty=hard&q=reaction');
  });

  it('PAY-02 / SYS-03 keep Session SPOMOVE origin through payment and launch href', () => {
    expect(resolveMasterContextQueryKeys('/spokedu-master/spomove/session')).toContain('hubReturn');
    expect(resolveMasterContextQueryKeys('/spokedu-master/spomove/session')).toContain('returnTo');
    expect(resolveMasterContextQueryKeys('/spokedu-master/spomove/session')).toContain('session');
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(activity).toContain('buildActivitySessionHref(activeSession.id)');
    expect(activity).toContain('session: activeSession.id');
    expect(activity).toContain('sessionProgram: program.id');
  });

  it('resolves Session origin return ahead of Hub exploration', () => {
    expect(
      parseMasterWorkReturnHref(
        '/spokedu-master/activity?session=abc',
        '/spokedu-master/spomove?group=stroop',
      ),
    ).toBe('/spokedu-master/activity?session=abc');
    expect(buildActivitySessionHref('sess-9')).toBe('/spokedu-master/activity?session=sess-9');
    expect(readSpomoveSessionOrigin(new URLSearchParams('session=s1&sessionProgram=p1')).isSessionOrigin).toBe(true);
  });
});
