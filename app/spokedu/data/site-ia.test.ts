import { describe, expect, it } from 'vitest';
import { contactPageContent } from '../contact/contact-page-data';
import { curriculumPage } from './curriculum-page';
import { dispatchPage } from './dispatch-page';
import { HOME_MAIN_CASE_SLUGS, homePage } from './home-page';
import { privatePage } from './private-page';
import { programDetailBlocks } from './program-details';
import { seoMeta } from './seo';
import { HOME_PROGRAM_SYSTEM_HREF, siteNav, SPOKEDU_BASE_PATH } from './site';

describe('spokedu site IA', () => {
  it('exposes primary siteNav entries in expected order', () => {
    expect(siteNav.map((entry) => entry.label)).toEqual([
      '스포키듀',
      '프로그램',
      'SPOMOVE',
      '수업 사례',
      '문의',
    ]);
  });

  it('keeps program children as page-level destinations only', () => {
    const programs = siteNav.find((entry) => entry.type === 'group' && entry.label === '프로그램');
    expect(programs?.type).toBe('group');
    if (programs?.type !== 'group') return;
    expect(programs.children.map((child) => child.label)).toEqual([
      '개인·소그룹 수업',
      '기관 프로그램',
      '커리큘럼·지도자 교육',
    ]);
    // 특수체육은 전용 페이지가 아니라 기관 프로그램 라인업 하위 항목
    expect(programs.children.some((child) => child.href.includes('#special'))).toBe(false);
  });

  it('defines six home sections with proof strip and audience gate', () => {
    expect(homePage.hero.lines[0]).toContain('기관과 아이');
    expect(homePage.hero.quickLinks.map((link) => link.label)).toEqual([
      '기관 담당자',
      '학부모',
      '커리큘럼·지도자 교육',
    ]);
    expect(homePage.proofStrip.items).toHaveLength(4);
    expect(homePage.proofStrip.processLine).toContain('현장 수업');
    expect(homePage.audienceGate.title).toBe('어떤 수업이 필요하신가요?');
    expect(homePage.proofStrip.title).toBe('왜 스포키듀인가');
    expect(homePage.trustStrip.items).toHaveLength(4);
    expect(homePage.trustStrip.items[0]?.value).toBeTruthy();
    expect(homePage.audienceGate.items).toHaveLength(3);
    expect(homePage.audienceGate.items.map((item) => item.fit)).toHaveLength(3);
    expect(homePage.audienceGate.items[2]?.id).toBe('curriculum');
    expect(homePage.spomove.flowSteps).toHaveLength(4);
    expect(homePage.spomove.proofs).toHaveLength(3);
    expect(homePage.spomove.useCases).toHaveLength(3);
    expect(homePage.cases.proofStats).toHaveLength(3);
    expect(homePage.cases.recordsCta.href).toBe(`${SPOKEDU_BASE_PATH}/records`);
    expect(homePage.cases.consultCta.href).toBe(`${SPOKEDU_BASE_PATH}/contact?type=dispatch`);
    expect(homePage.cases.cards.length).toBe(4);
    expect(homePage.finalCta.items).toHaveLength(3);
    expect(homePage.finalCta.notes).toHaveLength(3);
    expect(homePage.finalCta.support).toContain('프로그램이 정해지지 않았어도');
  });

  it('uses verified catalog slugs for home cases', () => {
    expect(HOME_MAIN_CASE_SLUGS).toEqual([
      'dongjak-spomove',
      'yangcheon-paps',
      'dasarang-oneday',
      'seodaemun-event-booth',
    ]);
    expect(homePage.cases.cards.map((card) => card.slug)).toEqual([...HOME_MAIN_CASE_SLUGS]);
    expect(homePage.cases.cards).toHaveLength(4);
  });

  it('keeps home SEO aligned with the homepage positioning', () => {
    expect(seoMeta.home.title).toContain('기관·개인');
    expect(seoMeta.home.description).toContain('SPOMOVE');
    expect(seoMeta.home.description).toContain('키움센터');
  });

  it('keeps program index href valid (no self-redirect target)', () => {
    expect(HOME_PROGRAM_SYSTEM_HREF).toBe(`${SPOKEDU_BASE_PATH}/programs`);
  });
});

describe('spokedu dispatch process one-pager', () => {
  it('exposes a 4-step flow and consult checklist', () => {
    expect(dispatchPage.processOnePager.flow.map((s) => s.label)).toEqual([
      '문의',
      '조건 확인',
      '시안·시연',
      '운영',
    ]);
    expect(dispatchPage.processOnePager.checklist.items.length).toBeGreaterThanOrEqual(4);
    expect(dispatchPage.processOnePager.formats.items).toEqual(['정규수업', '원데이 행사', '방학캠프']);
    expect(dispatchPage.processOnePager.cta.href).toBe('#contact');
  });

  it('attributes partner reviews to real venues without anonymous ○○ names', () => {
    for (const item of dispatchPage.partnerReviews.items) {
      expect(item.name).not.toMatch(/○○/);
      expect(item.org).not.toMatch(/○○|OO구/);
      expect(item.org.length).toBeGreaterThan(2);
    }
  });
});

describe('spokedu audience funnel process one-pagers', () => {
  it('keeps private and curriculum process one-pagers aligned with funnel CTAs', () => {
    expect(privatePage.processOnePager.flow.map((s) => s.label)).toEqual([
      '문의',
      '상담·조율',
      '첫 수업',
      '피드백',
    ]);
    expect(privatePage.processOnePager.cta.href).toBe('#apply');
    expect(curriculumPage.processOnePager.flow.map((s) => s.label)).toEqual([
      '문의',
      '범위 확인',
      '맞춤 제안',
      '교육·납품',
    ]);
    expect(curriculumPage.processOnePager.cta.href).toBe('#inquiry');
  });
});

describe('spokedu cross-page proof grammar', () => {
  it('attaches field-record proof links on every program detail block', () => {
    for (const block of Object.values(programDetailBlocks)) {
      expect(block.fieldRecordSlugs.length).toBeGreaterThan(0);
      expect(block.trustLine.length).toBeGreaterThan(0);
      expect(block.finalCtaSub).toContain('상담으로 이어드립니다');
    }
  });

  it('exposes contact expect guide checklist', () => {
    expect(contactPageContent.expectGuide.items.length).toBeGreaterThanOrEqual(4);
    expect(contactPageContent.expectGuide.responseNote).toContain('영업일');
  });
});
