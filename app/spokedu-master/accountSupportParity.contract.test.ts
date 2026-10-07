import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER account support parity', () => {
  it('shares the complete FAQ source between landing and profile', () => {
    const faqs = read('app/spokedu-master/lib/masterFaq.ts');
    const landing = read('app/spokedu-master/landing/components/LandingSections.tsx');
    const profile = read('app/spokedu-master/profile/page.tsx');
    expect((faqs.match(/^  \['/gm) ?? [])).toHaveLength(11);
    expect(landing).toContain('MASTER_FAQS.map');
    expect(profile).toContain('MASTER_FAQS.map');
  });

  it('uses the official Kakao channel as the customer-service destination', () => {
    const businessInfo = read('app/spokedu-master/lib/businessInfo.ts');
    expect(businessInfo).toContain("MASTER_KAKAO_CHANNEL_HREF = 'https://pf.kakao.com/_VGWxeb/chat'");
    expect(businessInfo).toContain('MASTER_CUSTOMER_SERVICE_HREF = MASTER_KAKAO_CHANNEL_HREF');
  });
});

