import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MASTER_BUSINESS_INFO,
  MASTER_CUSTOMER_SERVICE_HREF,
  MASTER_CUSTOMER_SERVICE_TEL_HREF,
  MASTER_CENTER_INQUIRY_HREF,
} from './lib/businessInfo';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER business info contract', () => {
  it('has the confirmed business name', () => {
    expect(MASTER_BUSINESS_INFO.businessName).toBe('스포키듀');
  });

  it('has the confirmed representative and email', () => {
    expect(MASTER_BUSINESS_INFO.representativeName).toBe('최지훈');
    expect(MASTER_BUSINESS_INFO.customerServiceEmail).toBe('spokedu77@gmail.com');
    expect(MASTER_BUSINESS_INFO.mailOrderStatus).toBe('신고 완료');
  });

  it('has the confirmed phone number and address', () => {
    expect(MASTER_BUSINESS_INFO.customerServicePhone).toBe('010-4437-9294');
    expect(MASTER_BUSINESS_INFO.businessAddress).toContain('7층 1호');
    expect(MASTER_BUSINESS_INFO.businessAddress).not.toContain('7층 2호');
  });

  it('generates correct contact hrefs', () => {
    expect(MASTER_CUSTOMER_SERVICE_TEL_HREF).toBe('tel:01044379294');
    expect(MASTER_CUSTOMER_SERVICE_HREF).toBe('mailto:spokedu77@gmail.com');
    expect(MASTER_CENTER_INQUIRY_HREF).toContain('mailto:spokedu77@gmail.com');
    expect(MASTER_CENTER_INQUIRY_HREF).toContain('subject=');
  });

  it('removes old business name and address from user-facing source', () => {
    const files = [
      'app/spokedu-master/landing/page.tsx',
      'app/spokedu-master/profile/page.tsx',
      'app/spokedu-master/payment/success/page.tsx',
      'app/spokedu-master/components/layout/AppShell.tsx',
      'app/spokedu-master/components/ui/SubscriptionGateWall.tsx',
      'app/spokedu-master/director/page.tsx',
      'app/spokedu-master/onboarding/page.tsx',
      'app/spokedu-master/terms/page.tsx',
      'app/spokedu-master/privacy/page.tsx',
    ];
    const source = files.map(read).join('\n');

    expect(source).not.toContain('스포케듀');
    expect(source).not.toContain('7층 2호');
    expect(source).not.toContain('support@spokedu.com');
    const usesApprovedContact =
      source.includes('spokedu77@gmail.com') ||
      source.includes('MASTER_SUPPORT_EMAIL') ||
      source.includes('MASTER_BUSINESS_INFO') ||
      source.includes('MASTER_CUSTOMER_SERVICE_HREF') ||
      source.includes('MASTER_CUSTOMER_SERVICE_TEL_HREF') ||
      source.includes('MASTER_CENTER_INQUIRY_HREF');
    expect(usesApprovedContact).toBe(true);
  });

  it('shows correct values in landing footer', () => {
    const landing = read('app/spokedu-master/landing/page.tsx');

    expect(landing).not.toContain('신청 중');
    expect(landing).not.toContain('스포케듀');
    expect(landing).not.toContain('7층 2호');
    expect(landing).toContain('MASTER_BUSINESS_INFO.mailOrderStatus');
    expect(landing).toContain('MASTER_BUSINESS_INFO.representativeName');
    expect(landing).toContain('MASTER_BUSINESS_INFO.customerServicePhone');
    expect(landing).toContain('MASTER_BUSINESS_INFO.customerServiceEmail');
  });

  it('uses single source for all business info in landing footer', () => {
    const landing = read('app/spokedu-master/landing/page.tsx');

    expect(landing).toContain('MASTER_BUSINESS_INFO.businessName');
    expect(landing).toContain('MASTER_BUSINESS_INFO.representativeName');
    expect(landing).toContain('MASTER_BUSINESS_INFO.businessRegistrationNumber');
    expect(landing).toContain('MASTER_BUSINESS_INFO.mailOrderStatus');
    expect(landing).toContain('MASTER_BUSINESS_INFO.businessAddress');
    expect(landing).toContain('MASTER_BUSINESS_INFO.customerServicePhone');
    expect(landing).toContain('MASTER_BUSINESS_INFO.customerServiceEmail');
  });
});
