import { describe, expect, it } from 'vitest';
import { contactPageContent } from '../contact/contact-page-data';
import { dispatchEvidenceVisuals } from '../components/dispatch-program-lineup';
import { spomoveActivityVisuals } from '../components/spomove-program-landing';
import { curriculumPage } from './curriculum-page';
import { HOME_MEDIA } from './home-media';
import { dispatchPage } from './dispatch-page';
import { HOME_MAIN_CASE_SLUGS, homePage } from './home-page';
import { privatePage } from './private-page';
import { programDetailBlocks } from './program-details';
import { seoMeta } from './seo';
import {
  canUseSpokeduImageOnPage,
  getSpokeduImageUsageErrors,
  isSpokeduImageProgramMatch,
  SPOKEDU_IMAGES,
} from './images';
import { HOME_PROGRAM_SYSTEM_HREF, siteNav, SPOKEDU_BASE_PATH } from './site';
import { spomoveProgramPage } from './spomove-program-page';

function allowsVisualFallback(requirement: object): boolean {
  return 'allowVisualFallback' in requirement && requirement.allowVisualFallback === true;
}

describe('spokedu site IA', () => {
  it('exposes primary siteNav entries in expected order', () => {
    expect(siteNav.map((entry) => entry.label)).toEqual([
      '스포키듀',
      '개인수업',
      '기관수업',
      '프로그램',
      '커리큘럼',
      '사례',
      '문의',
    ]);
  });

  it('keeps SPOMOVE as the featured program, not an audience type', () => {
    const programs = siteNav.find((entry) => entry.type === 'group' && entry.label === '프로그램');
    expect(programs?.type).toBe('group');
    if (programs?.type !== 'group') return;
    expect(programs.children.map((child) => child.label)).toEqual([
      'SPOMOVE',
      'PAPS',
      '월간 뉴스포츠',
      '원데이',
      '방학캠프',
    ]);
    expect(programs.children[0]?.href).toBe(`${SPOKEDU_BASE_PATH}/programs/spomove`);
  });

  it('defines six home sections with proof strip and audience gate', () => {
    expect(homePage.hero.lines[0]).toContain('아이와 현장');
    expect(homePage.hero.quickLinks.map((link) => link.label)).toEqual([
      '기관 담당자',
      '학부모',
      '지도자·파트너',
    ]);
    expect(homePage.proofStrip.items).toHaveLength(4);
    expect(homePage.proofStrip.processLine).toContain('현장');
    expect(homePage.audienceGate.title).toBe('어떤 수업이 필요하신가요?');
    expect(homePage.proofStrip.title).toContain('교육의 기준');
    expect(homePage.trustStrip.items).toHaveLength(4);
    expect(homePage.trustStrip.items[0]?.value).toMatch(/년\+$/);
    expect(homePage.trustStrip.items[0]?.label).toContain('2020');
    expect(homePage.trustStrip.items[1]?.value).toMatch(/유형$/);
    expect(homePage.trustStrip.items[2]?.value).toBe('기관·개인');
    expect(homePage.trustStrip.items[3]?.value).toBe('다층 운영');
    expect(homePage.trustStrip.items.some((item) => /\d+건/.test(item.value))).toBe(false);
    expect(homePage.trustStrip.items.some((item) => item.value.includes('120'))).toBe(false);
    expect(homePage.trustStrip.items.some((item) => /만/.test(item.value))).toBe(false);
    expect(homePage.trustStrip.eyebrow).toBe('운영 경험');
    expect(homePage.audienceGate.items).toHaveLength(3);
    expect(homePage.audienceGate.items.map((item) => item.id)).toEqual(['dispatch', 'private', 'curriculum']);
    expect(homePage.audienceGate.items.map((item) => item.id)).not.toContain('spomove');
    expect(homePage.audienceGate.items[0]?.bullets).toContain('SPOMOVE 도입');
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
      'maedong-sports-stepup',
      'donghaeng-special-pe',
      'gangdong-health-pe',
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

  it('records image usage metadata for proof-sensitive assets', () => {
    expect(SPOKEDU_IMAGES.programs.spomove.kind).toBe('field-photo');
    expect(isSpokeduImageProgramMatch(SPOKEDU_IMAGES.programs.spomove, 'spomove')).toBe(true);
    expect(isSpokeduImageProgramMatch(SPOKEDU_IMAGES.programs.spomove, 'camp')).toBe(false);
    expect(SPOKEDU_IMAGES.curriculum.lessonPlan.kind).toBe('document');
    expect(canUseSpokeduImageOnPage(SPOKEDU_IMAGES.curriculum.lessonPlan, 'curriculum')).toBe(true);
    expect(canUseSpokeduImageOnPage(SPOKEDU_IMAGES.curriculum.lessonPlan, 'dispatch')).toBe(false);
  });

  it('keeps public curriculum media slots aligned with image evidence contracts', () => {
    const slots = [
      ...curriculumPage.contentProducts.items,
      ...curriculumPage.serviceExamples.items,
    ];

    for (const slot of slots) {
      const media = HOME_MEDIA[slot.mediaKey];
      const requirement = slot.mediaRequirement;
      if (media.type === 'visual') {
        expect(allowsVisualFallback(requirement), `${slot.title} visual fallback must be intentional`).toBe(true);
        expect(media.asset, `${slot.title} visual fallback must not hide a mismatched photo`).toBeUndefined();
        continue;
      }

      expect(media.asset, `${slot.title} must expose its backing image asset`).toBeDefined();
      if (!media.asset) continue;
      expect(getSpokeduImageUsageErrors(media.asset, requirement), slot.title).toEqual([]);
    }
  });

  it('does not expose unverified or placeholder curriculum photos through public slots', () => {
    const slots = [
      curriculumPage.hero,
      ...curriculumPage.contentProducts.items,
      ...curriculumPage.serviceExamples.items,
    ];

    for (const slot of slots) {
      const media = HOME_MEDIA[slot.mediaKey];
      if (!media.asset) continue;
      expect(media.asset.verified, `${slot.mediaKey} should be verified`).toBe(true);
      expect(media.asset.assetStatus, `${slot.mediaKey} should not be placeholder-copy`).not.toBe('placeholder-copy');
    }
  });

  it('keeps dispatch lineup media aligned with program contracts', () => {
    const items = dispatchPage.programLineup.items;
    expect(items.map((item) => item.mediaKey)).toEqual([
      'dispatchSpomove',
      'dispatchMonthlySports',
      'dispatchSpecialPe',
      'dispatchMiniOlympics',
      'dispatchSportsBooth',
      'dispatchCustomDesign',
    ]);

    for (const item of items) {
      expect('image' in item, `${item.id} should not keep a raw image path`).toBe(false);
      expect('imageAlt' in item, `${item.id} should not keep a raw image alt`).toBe(false);
      const media = HOME_MEDIA[item.mediaKey];
      const requirement = item.mediaRequirement;
      if (media.type === 'visual') {
        expect(allowsVisualFallback(requirement), `${item.id} visual fallback must be intentional`).toBe(true);
        expect(media.asset, `${item.id} visual fallback must not hide a mismatched photo`).toBeUndefined();
        expect(dispatchEvidenceVisuals[item.id], `${item.id} must render a structured evidence panel`).toBeDefined();
        continue;
      }

      expect(media.asset, `${item.id} must expose its backing image asset`).toBeDefined();
      if (!media.asset) continue;
      expect(getSpokeduImageUsageErrors(media.asset, requirement), item.id).toEqual([]);
    }
  });

  it('does not reintroduce known dispatch lineup image mismatches', () => {
    const byId = Object.fromEntries(dispatchPage.programLineup.items.map((item) => [item.id, item]));
    expect(byId['monthly-sports']?.mediaKey).not.toBe('programOneday');
    expect(byId['mini-olympics']?.mediaKey).not.toBe('programCamp');
    expect(byId['slow-sports']?.mediaKey).not.toBe('proofCenter');
    expect(byId['sports-booth']?.mediaKey).not.toBe('programOneday');
    expect(byId.custom?.mediaKey).not.toBe('trackDispatch');
  });

  it('frames dispatch as an institution operation decision flow', () => {
    expect(dispatchPage.intent.decisionQuestion).toContain('기관 조건');
    expect(dispatchPage.intent.primaryAudience).toBe('기관 담당자');
    expect(dispatchPage.intent.primaryCtaIntent).toContain('운영안');
    expect(dispatchPage.intent.mustProve).toEqual([
      '공간 대응',
      '인원 대응',
      '연령 대응',
      '운영 방식',
      '실제 사례',
    ]);
    expect(dispatchPage.heroCtas.primary.label).toContain('기관 조건');
    expect(dispatchPage.heroCtas.secondary.href).toBe('#evidence');
    expect(dispatchPage.decisionFit.items.map((item) => item.label)).toEqual(['공간', '인원', '연령', '운영']);
    expect(dispatchPage.intent.pageFlow.length).toBeLessThanOrEqual(8);
    expect(dispatchPage.operationSolutions.groups).toHaveLength(3);
    expect(dispatchPage.comparison.title).toContain('운영 기준');
    expect(JSON.stringify(dispatchPage.comparison)).not.toMatch(/프리랜서|다른 업체|기본 업체|시간 채우기|전무함/);
    expect(dispatchPage.examples.items.length).toBeGreaterThanOrEqual(2);
    expect(dispatchPage.examples.items.every((item) => item.fitReason && item.review)).toBe(true);
    expect(dispatchPage.processOnePager.flow.map((s) => s.label)).toEqual(['조건 확인', '운영안 제안', '수업 운영']);
  });

  it('frames private as a child-fit consultation decision flow', () => {
    expect(privatePage.intent.decisionQuestion).toContain('우리 아이');
    expect(privatePage.intent.primaryAudience).toContain('학부모');
    expect(privatePage.intent.primaryCtaIntent).toContain('아이 조건');
    expect(privatePage.intent.mustProve).toEqual([
      '아이 적합성',
      '수업 방식',
      '지도자 신뢰',
      '실제 수업',
      '상담 가능 조건',
    ]);
    expect(privatePage.intent.pageFlow.length).toBeLessThanOrEqual(8);
    expect(privatePage.goalPaths.items.map((item) => item.title)).toEqual([
      '운동 자신감',
      '기초체력·움직임',
      '종목 준비',
      '또래 협동',
    ]);
    expect(privatePage.heroCtas.primary.label).toContain('아이 조건');
    expect(privatePage.reviews.items[0]?.text).not.toContain('학원에내면');
  });

  it('keeps SPOMOVE activity media aligned with task contracts', () => {
    const slots = [
      spomoveProgramPage.hero,
      spomoveProgramPage.padSystem,
      ...spomoveProgramPage.activities.items,
    ];
    const activityMediaKeys = spomoveProgramPage.activities.items.map((item) => item.mediaKey);

    expect(activityMediaKeys).toContain('spomoveRhythmField');
    expect(activityMediaKeys).toContain('spomoveSimonScreen');
    expect(activityMediaKeys).toContain('spomoveFlankerScreen');
    expect(activityMediaKeys).toContain('spomoveStroopScreen');
    expect(activityMediaKeys).toContain('spomoveColorReactionField');
    expect(activityMediaKeys).not.toContain('proofCenter');
    expect(activityMediaKeys).not.toContain('proofClass');
    expect(activityMediaKeys).not.toContain('trackDispatch');

    for (const slot of slots) {
      const media = HOME_MEDIA[slot.mediaKey];
      const requirement = slot.mediaRequirement;

      if (media.type === 'visual') {
        expect(allowsVisualFallback(requirement), `${slot.mediaKey} visual fallback must be intentional`).toBe(true);
        expect(requirement.kind, `${slot.mediaKey} visual fallback should only stand in for screens or diagrams`).toMatch(
          /^(screen|diagram)$/,
        );
        expect(media.asset, `${slot.mediaKey} visual fallback must not hide a mismatched photo`).toBeUndefined();
        expect(spomoveActivityVisuals[slot.mediaKey], `${slot.mediaKey} must render a structured task panel`).toBeDefined();
        continue;
      }

      expect(media.asset, `${slot.mediaKey} must expose its backing image asset`).toBeDefined();
      if (!media.asset) continue;
      expect(getSpokeduImageUsageErrors(media.asset, requirement), slot.mediaKey).toEqual([]);
    }
  });
});

describe('spokedu dispatch process one-pager', () => {
  it('exposes a 4-step flow and consult checklist', () => {
    expect(dispatchPage.processOnePager.flow.map((s) => s.label)).toEqual(['조건 확인', '운영안 제안', '수업 운영']);
    expect(dispatchPage.processOnePager.checklist.items.length).toBeGreaterThanOrEqual(4);
    expect(dispatchPage.processOnePager.formats.items).toEqual(['프로그램 구성', '현장 동선', '강사·준비물 범위']);
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
