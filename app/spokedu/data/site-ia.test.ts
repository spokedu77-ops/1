import { describe, expect, it } from 'vitest';
import { HOME_MAIN_CASE_SLUGS, homePage } from './home-page';
import { siteNav, SPOKEDU_BASE_PATH } from './site';

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

  it('includes program children with special education anchor', () => {
    const programs = siteNav.find((entry) => entry.type === 'group' && entry.label === '프로그램');
    expect(programs?.type).toBe('group');
    if (programs?.type !== 'group') return;
    expect(programs.children.map((child) => child.label)).toEqual([
      '개인·소그룹 수업',
      '기관 출강',
      '특수체육',
      '커리큘럼·지도자 교육',
    ]);
    const special = programs.children.find((child) => child.label === '특수체육');
    expect(special?.href).toBe(`${SPOKEDU_BASE_PATH}/dispatch#special`);
  });

  it('defines five home sections with proof strip and audience gate', () => {
    expect(homePage.hero.lines[0]).toContain('아이의 움직임');
    expect(homePage.proofStrip.items).toHaveLength(3);
    expect(homePage.audienceGate.items).toHaveLength(3);
    expect(homePage.spomove.flowSteps).toHaveLength(4);
    expect(homePage.spomove.flowSteps.map((step) => step.label)).toEqual(['인지', '선택', '수행', '조절']);
    expect(homePage.cases.cards).toHaveLength(3);
    expect(homePage.finalCta.items).toHaveLength(3);
  });

  it('uses verified catalog slugs for home cases', () => {
    expect(HOME_MAIN_CASE_SLUGS).toEqual(['maedong-sports-stepup', 'dasarang-oneday', 'dongjak-spomove']);
    expect(homePage.cases.cards.map((card) => card.slug)).toEqual([...HOME_MAIN_CASE_SLUGS]);
  });
});
