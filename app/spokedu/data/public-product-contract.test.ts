import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MASTER_LITE_PRICE_KRW,
  MASTER_PREMIUM_PRICE_KRW,
  MASTER_PRODUCT_CATALOG,
} from '@/app/spokedu-master/lib/productCatalog';
import { getPublicProductContract, getPublicPurchasablePlans } from './public-product-contract';
import { curriculumPage } from './curriculum-page';

const spokeduRoot = join(process.cwd(), 'app/spokedu');

function readSpokedu(relative: string) {
  return readFileSync(join(spokeduRoot, relative), 'utf8');
}

describe('spokedu public product contract (marketing)', () => {
  it('re-exports MASTER public slice without deep-importing productCatalog', () => {
    const contractSource = readSpokedu('data/public-product-contract.ts');
    expect(contractSource).toContain('publicProductContract');
    expect(contractSource).not.toMatch(/from ['"].*productCatalog['"]/);

    const curriculumLanding = readSpokedu('components/curriculum-landing.tsx');
    const curriculumPageSource = readSpokedu('data/curriculum-page.ts');
    expect(curriculumLanding).not.toMatch(/productCatalog/);
    expect(curriculumPageSource).not.toMatch(/productCatalog/);
    expect(curriculumLanding).toContain('getPublicProductContract');
  });

  it('does not hardcode Lite/Premium price digits in marketing curriculum data', () => {
    const pageSource = readSpokedu('data/curriculum-page.ts');
    expect(pageSource).not.toMatch(/\b9900\b|\b28900\b/);
    expect(pageSource).not.toMatch(/9,?900|28,?900/);

    const contract = getPublicProductContract();
    const lite = contract.plans.find((p) => p.code === 'lite');
    const premium = contract.plans.find((p) => p.code === 'premium');
    expect(lite?.monthlyPriceKrw).toBe(MASTER_LITE_PRICE_KRW);
    expect(premium?.monthlyPriceKrw).toBe(MASTER_PREMIUM_PRICE_KRW);
    expect(lite?.priceLabel).toBe(MASTER_PRODUCT_CATALOG.lite.priceLabel);
    expect(getPublicPurchasablePlans()).toHaveLength(2);
  });

  it('keeps subscription hub copy free of SPO-MAT and unverified counters', () => {
    const json = JSON.stringify(curriculumPage);
    expect(json).not.toMatch(/SPO-MAT/);
    expect(json).not.toMatch(/15,?015|1,?000\+|3,?000회|500기관|98%/);
    expect(json).not.toMatch(/집중력이 향상|인지능력이|발달이 향상|치료/);
  });

  it('does not publish SPOMAT or annual prices through marketing contract', () => {
    const contract = getPublicProductContract();
    expect(contract.annualSold).toBe(false);
    expect(contract.spomat.pricesPublished).toBe(false);
    expect(JSON.stringify(contract.spomat)).not.toMatch(/20,?900|15,?900|20900|15900/);
  });
});
