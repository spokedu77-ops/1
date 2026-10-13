import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('official MASTER commercial landing IA', () => {
  const page = read('app/spokedu-master/landing/CommercialLanding.tsx');
  const sections = read('app/spokedu-master/landing/components/LandingSections.tsx');
  const subscription = read('app/(spokedu-public)/subscription/page.tsx');
  const faqSource = read('app/spokedu-master/landing/landingFaq.ts');

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
    expect(sections).toContain('프리미엄은 라이트의 모든 기능에 SPOMOVE를 더한 요금제입니다');
    expect(sections).toContain('LANDING_FAQS.map');
    expect(faqSource).toContain('기록이 사라지나요?');
    expect((faqSource.match(/^  \["/gm) ?? [])).toHaveLength(11);
  });

  it('uses the approved free, notice, and premium commercial language', () => {
    expect(sections).toContain('지정된 놀이체육 프로그램 1개 미리보기');
    expect(faqSource).toContain('수업 기록과 학생 관찰, 다음 수업 메모, 수업 안내문 작성 기능');
    expect(sections).not.toContain('보호자 안내문');
    expect(sections).not.toContain('무료 프로그램 체험');
    expect(sections).not.toContain('무료 수업 체험');
    expect(sections).not.toContain('Premium은 여기에 수업 기록');
    expect(sections).not.toContain('기록과 SPOMOVE');
    expect(sections).not.toContain('SPOMAT 회원가');
    expect(sections).not.toContain('프리미엄 회원가');
    for (const staleCopy of ['Free로', 'Lite에서', 'Premium은', 'Library를', 'Class Tools에서', 'Session 기록', 'CENTER · INSTITUTION']) {
      expect(sections).not.toContain(staleCopy);
    }
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
