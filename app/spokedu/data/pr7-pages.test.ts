import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aboutPage } from './about-page';
import { spomatPage } from './spomat-page';
import { partnersPage } from './partners-page';
import { footerServiceLinks, siteNav, SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';
import { getPublicProductContract } from './public-product-contract';

describe('PR7 about / spomat / partners', () => {
  it('keeps about within 6 top sections and avoids unverified counters', () => {
    expect(aboutPage.sectionOrder.length).toBeLessThanOrEqual(6);
    expect(aboutPage.history.milestones.length).toBeLessThanOrEqual(8);
    const json = JSON.stringify(aboutPage);
    expect(json).not.toMatch(/15,?015|3,?000|500기관|98%|팔로워|최고|유일|검증된 전문가/);
    expect(json).not.toMatch(/9,?900|28,?900|SPO-MAT/);
    expect(aboutPage.nextPaths.items.map((i) => i.href)).toEqual([
      `${SPOKEDU_BASE_PATH}/education`,
      `${SPOKEDU_PATHS.spomove}`,
      `${SPOKEDU_PATHS.subscription}`,
      `${SPOKEDU_BASE_PATH}/contact`,
    ]);
  });

  it('defines SPOMAT as execution tool without published prices', () => {
    expect(spomatPage.definition.title).toMatch(/실행/);
    expect(JSON.stringify(spomatPage)).not.toMatch(/20,?900|15,?900|20900|15900|SPO-MAT|필수 구매|반드시 필요/);
    expect(getPublicProductContract().spomat.pricesPublished).toBe(false);
    expect(spomatPage.purchase.primary.href).toBe(getPublicProductContract().spomat.shopHref);
    expect(spomatPage.specs.items.some((i) => i.label === '규격')).toBe(true);
  });

  it('keeps partners as secondary to contact and does not expand top nav', () => {
    expect(partnersPage.cta.primary.href).toContain('/contact');
    expect(siteNav.filter((e) => e.type === 'link')).toHaveLength(6);
    expect(siteNav.some((e) => e.type === 'link' && e.href.includes('/partners'))).toBe(false);
    expect(siteNav.some((e) => e.type === 'link' && e.href.includes('/spomat'))).toBe(false);
    expect(footerServiceLinks.some((l) => l.href === `${SPOKEDU_BASE_PATH}/spomat`)).toBe(true);
    expect(footerServiceLinks.some((l) => l.href === `${SPOKEDU_BASE_PATH}/partners`)).toBe(true);
  });

  it('has page routes for spomat and partners', () => {
    const spomat = readFileSync(join(process.cwd(), 'app/spokedu/spomat/page.tsx'), 'utf8');
    const partners = readFileSync(join(process.cwd(), 'app/spokedu/partners/page.tsx'), 'utf8');
    expect(spomat).toContain('SpomatLanding');
    expect(partners).toContain('PartnersLanding');
  });
});
