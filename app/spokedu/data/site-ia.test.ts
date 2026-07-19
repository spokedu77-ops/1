import { describe, expect, it } from 'vitest';
import { HOME_MAIN_CASE_SLUGS, homePage } from './home-page';
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
