import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('official MASTER commercial landing IA', () => {
  const page = read('app/spokedu-master/landing/CommercialLanding.tsx');
  const sections = read('app/spokedu-master/landing/components/LandingSections.tsx');
  const subscription = read('app/(spokedu-public)/subscription/page.tsx');

  it('keeps the approved section sequence', () => {
    const sequence = ['LandingHero', 'ProductOverview', 'CoreProductStory', 'SpomoveSection', 'WhyMasterSection', 'ProductDetailSection', 'FieldProofSection', 'AudienceSection', 'PlansSection', 'CenterSection', 'FaqAndFinalCta'];
    let cursor = -1;
    for (const component of sequence) {
      const next = page.indexOf(`<${component}`, cursor + 1);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  it('publishes PD-011 plan truth and eleven purchase FAQs', () => {
    expect(sections).toContain('수업 도구 8종');
    expect(sections).toContain('FREE_CLASS_TOOL_IDS');
    expect(sections).toContain('Premium은 Lite의 모든 기능에 SPOMOVE를 더한 플랜입니다');
    expect(sections).toContain('기록이 사라지나요?');
    const faqSource = sections.slice(sections.indexOf('const FAQS = ['), sections.indexOf('] as const;', sections.indexOf('const FAQS = [')));
    expect((faqSource.match(/^  \['/gm) ?? [])).toHaveLength(11);
  });

  it('uses the approved Free, notice, and Premium commercial language', () => {
    expect(sections).toContain('이번 주 추천 프로그램 1개 전체 이용');
    expect(sections).toContain('수업 안내문 저장·복사');
    expect(sections).not.toContain('보호자 안내문');
    expect(sections).not.toContain('무료 프로그램 체험');
    expect(sections).not.toContain('무료 수업 체험');
    expect(sections).not.toContain('Premium은 여기에 수업 기록');
    expect(sections).not.toContain('기록과 SPOMOVE');
    expect(sections).not.toContain('SPOMAT 회원가');
    expect(sections).not.toContain('프리미엄 회원가');
  });

  it('owns canonical metadata, real OG proof and structured data', () => {
    expect(subscription).toContain('https://schema.org');
    expect(subscription).toContain("'SoftwareApplication'");
    expect(subscription).toContain('/api/spokedu-master/og');
    expect(subscription).toContain("robots: { index: true, follow: true }");
    expect(subscription).not.toContain('aggregateRating');
    expect(subscription).not.toContain('reviewCount');
  });
});
