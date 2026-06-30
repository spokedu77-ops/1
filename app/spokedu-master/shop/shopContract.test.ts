import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPOMAT_PRODUCT_CONTRACT } from '../lib/productCatalog';
import { SPOMAT_BULK_INQUIRY_HREF } from '../lib/businessInfo';
import { isSafePurchaseUrl } from '../../api/spokedu-master/shop/spomat/purchase/route';

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('SPOMAT shop UI contract', () => {
  it('prices come from SPOMAT_PRODUCT_CONTRACT', () => {
    expect(SPOMAT_PRODUCT_CONTRACT.regularPrice).toBe(20900);
    expect(SPOMAT_PRODUCT_CONTRACT.premiumPrice).toBe(15900);
    expect(SPOMAT_PRODUCT_CONTRACT.discountAmount).toBe(5000);
    expect(SPOMAT_PRODUCT_CONTRACT.premiumRequired).toBe(true);
  });

  it('shop page uses SPOMAT_PRODUCT_CONTRACT and not hardcoded prices', () => {
    const shop = read('app/spokedu-master/shop/page.tsx');

    expect(shop).toContain('SPOMAT_PRODUCT_CONTRACT.regularPrice');
    expect(shop).toContain('SPOMAT_PRODUCT_CONTRACT.premiumPrice');
    expect(shop).toContain('SPOMAT_PRODUCT_CONTRACT.discountAmount');
    expect(shop).not.toContain('20900');
    expect(shop).not.toContain('15900');
    expect(shop).not.toContain('5000');
  });

  it('shop page uses canBuySpomatAtMemberPrice for premium check', () => {
    const shop = read('app/spokedu-master/shop/page.tsx');

    expect(shop).toContain('canBuySpomatAtMemberPrice');
    expect(shop).not.toContain("plan === 'premium'");
  });

  it('purchase CTA points to server redirect route', () => {
    const shop = read('app/spokedu-master/shop/page.tsx');

    expect(shop).toContain('/api/spokedu-master/shop/spomat/purchase');
    expect(shop).not.toMatch(/href=["']https?:\/\//);
  });

  it('bulk inquiry uses SPOMAT_BULK_INQUIRY_HREF from businessInfo', () => {
    const shop = read('app/spokedu-master/shop/page.tsx');

    expect(shop).toContain('SPOMAT_BULK_INQUIRY_HREF');
    expect(SPOMAT_BULK_INQUIRY_HREF).toContain('mailto:spokedu77@gmail.com');
    expect(SPOMAT_BULK_INQUIRY_HREF).toContain('subject=');
  });

  it('shop entry is in profile secondary menu, not in tab bar or dashboard', () => {
    const tabBar = read('app/spokedu-master/components/layout/TabBar.tsx');
    const profile = read('app/spokedu-master/profile/page.tsx');
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const statusBar = read('app/spokedu-master/components/layout/StatusBar.tsx');

    expect(tabBar).not.toContain('shop');
    expect(dashboard).not.toContain('/spokedu-master/shop');
    // profile secondary menu is the single entry point
    expect(profile).toContain('/spokedu-master/shop');
    // StatusBar nav array must not contain shop (main nav excluded)
    expect(statusBar).not.toContain("href: '/spokedu-master/shop'");
  });
});

describe('SPOMAT purchase redirect route contract', () => {
  it('validates only safe purchase URLs (http/https only)', () => {
    expect(isSafePurchaseUrl(undefined)).toBe(false);
    expect(isSafePurchaseUrl('')).toBe(false);
    expect(isSafePurchaseUrl('javascript:void(0)')).toBe(false);
    expect(isSafePurchaseUrl('/relative/path')).toBe(false);
    expect(isSafePurchaseUrl('ftp://example.com')).toBe(false);
    expect(isSafePurchaseUrl('mailto:test@example.com')).toBe(false);
    expect(isSafePurchaseUrl('http://example.com/spomat')).toBe(true);
    expect(isSafePurchaseUrl('https://example.com/spomat')).toBe(true);
  });

  it('route has default URLs so development works without env vars', () => {
    const route = read('app/api/spokedu-master/shop/spomat/purchase/route.ts');

    expect(route).toContain('SPOMAT_DEFAULT_PUBLIC_URL');
    expect(route).toContain('SPOMAT_DEFAULT_PREMIUM_URL');
    expect(route).toContain('https://example.com/spomat');
    expect(route).toContain('https://example.com/spomat-premium');
    expect(route).toContain('??');
  });

  it('route checks server-side plan, not client params', () => {
    const route = read('app/api/spokedu-master/shop/spomat/purchase/route.ts');

    expect(route).toContain('isSpokeduMasterPaidPlanActive');
    expect(route).toContain("row.plan === 'premium'");
    expect(route).toContain('isPlatformAdminUser');
    expect(route).not.toContain('searchParams');
    expect(route).not.toContain('request.nextUrl');
    expect(route).not.toContain('GET(request');
  });

  it('route uses env vars with fallback defaults for purchase URLs', () => {
    const route = read('app/api/spokedu-master/shop/spomat/purchase/route.ts');

    expect(route).toContain('SPOMAT_PUBLIC_PURCHASE_URL');
    expect(route).toContain('SPOMAT_PREMIUM_PURCHASE_URL');
    expect(route).toContain('isSafePurchaseUrl');
    expect(route).not.toMatch(/redirect\(['"]https?:/);
  });

  it('route returns 503 for invalid public URL (no implicit redirect)', () => {
    const route = read('app/api/spokedu-master/shop/spomat/purchase/route.ts');

    expect(route).toContain('503');
    expect(route).toContain('isSafePurchaseUrl(publicUrl)');
  });

  it('route does not silently fallback premium users to public URL', () => {
    const route = read('app/api/spokedu-master/shop/spomat/purchase/route.ts');

    expect(route).toContain('회원가 구매 링크를 사용할 수 없습니다');
    expect(route).toContain('isSafePurchaseUrl(premiumUrl)');
  });

  it('admin is not treated as premium-eligible', () => {
    const route = read('app/api/spokedu-master/shop/spomat/purchase/route.ts');

    expect(route).toContain('isAdmin');
    expect(route).toContain('if (!isAdmin)');
  });
});
