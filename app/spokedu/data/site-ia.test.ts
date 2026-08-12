import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contactPageContent } from '../contact/contact-page-data';
import { dispatchEvidenceVisuals } from '../components/dispatch-program-lineup';
import { spomoveActivityVisuals } from '../components/spomove-program-landing';
import { aboutFounder } from './about-founder';
import { curriculumPage } from './curriculum-page';
import { HOME_MEDIA } from './home-media';
import { dispatchPage } from './dispatch-page';
import { HOME_MAIN_CASE_SLUGS, homePage } from './home-page';
import * as privateModule from './private-page';
import { privatePage, PRIVATE_FORMAT_OPTIONS, PRIVATE_START_DIRECTION_OPTIONS } from './private-page';
import { programDetailBlocks } from './program-details';
import { seoMeta } from './seo';
import {
  canUseSpokeduImageOnPage,
  getSpokeduImageUsageErrors,
  isSpokeduImageProgramMatch,
  SPOKEDU_IMAGES,
} from './images';
import { HOME_PROGRAM_SYSTEM_HREF, MASTER_HANDOFF, REDIRECT_ONLY_PROGRAM_PATHS, footerNavLinks, footerServiceLinks, siteHeaderCta, siteNav } from './site';
import { SPOKEDU_BASE_PATH, SPOKEDU_LEGACY_PREFIX, SPOKEDU_PATHS } from './public-routes';
import { educationHubPage } from './education-hub';
import { spomoveProgramPage } from './spomove-program-page';

function allowsVisualFallback(requirement: object): boolean {
  return 'allowVisualFallback' in requirement && requirement.allowVisualFallback === true;
}

describe('spokedu site IA', () => {
  it('exposes primary siteNav entries in expected order', () => {
    expect(siteNav.map((entry) => entry.label)).toEqual([
      '스포키듀',
      '체육교육',
      'SPOMOVE',
      '구독시스템',
      '운영 사례',
      '문의·협업',
    ]);
  });

  it('maps primary nav labels to locked destinations', () => {
    const byLabel = Object.fromEntries(
      siteNav.filter((entry) => entry.type === 'link').map((entry) => [entry.label, entry.href]),
    );
    expect(byLabel['체육교육']).toBe(SPOKEDU_PATHS.education);
    expect(byLabel.SPOMOVE).toBe(SPOKEDU_PATHS.spomove);
    expect(byLabel['구독시스템']).toBe(SPOKEDU_PATHS.subscription);
    expect(byLabel['운영 사례']).toBe(SPOKEDU_PATHS.records);
    expect(byLabel['문의·협업']).toBe(SPOKEDU_PATHS.contact);
    expect(byLabel['스포키듀']).toBe(SPOKEDU_PATHS.about);
  });

  it('hides redirect-only programs from global nav while keeping path data', () => {
    const navBlob = JSON.stringify(siteNav);
    expect(navBlob).not.toMatch(/PAPS|캠프|원데이|월간 뉴스포츠|방학캠프/);
    expect(siteNav.some((entry) => entry.type === 'group')).toBe(false);
    expect([...REDIRECT_ONLY_PROGRAM_PATHS]).toEqual([
      `${SPOKEDU_LEGACY_PREFIX}/programs/paps`,
      `${SPOKEDU_LEGACY_PREFIX}/programs/camp`,
      `${SPOKEDU_LEGACY_PREFIX}/programs/oneday-event`,
      `${SPOKEDU_LEGACY_PREFIX}/programs/monthly-newsports`,
    ]);
  });

  it('derives footer links from the same destinations as siteNav', () => {
    expect(footerNavLinks.map((link) => link.href)).toEqual(
      siteNav.filter((entry) => entry.type === 'link').map((entry) => entry.href),
    );
    expect(footerNavLinks.map((link) => link.label)).toEqual(siteNav.map((entry) => entry.label));
    expect(JSON.stringify(footerNavLinks)).not.toMatch(/PAPS|캠프|원데이|월간 뉴스포츠/);
    expect(JSON.stringify(footerServiceLinks)).not.toMatch(/PAPS|캠프|월간 뉴스포츠/);
    expect(JSON.stringify([...footerNavLinks, ...footerServiceLinks, siteHeaderCta])).not.toMatch(
      /\d{1,3},\d{3}|원\b|₩/,
    );
  });

  it('keeps MASTER handoff path constants stable', () => {
    expect(MASTER_HANDOFF.landing).toBe('/spokedu-master/landing');
    expect(MASTER_HANDOFF.onboardingLogin).toContain('/spokedu-master/onboarding');
    expect(MASTER_HANDOFF.dashboardLogin).toContain('/spokedu-master/dashboard');
    expect(MASTER_HANDOFF.payment).toBe('/spokedu-master/payment');
    expect(MASTER_HANDOFF.shop).toBe('/spokedu-master/shop');
  });

  it('exposes education hub with institution and private routing', () => {
    expect(educationHubPage.sectionOrder).toHaveLength(6);
    expect(educationHubPage.hero.primaryCta.href).toBe(`${SPOKEDU_BASE_PATH}/dispatch`);
    expect(educationHubPage.hero.secondaryCta.href).toBe(`${SPOKEDU_BASE_PATH}/private`);
    expect(educationHubPage.primaryPaths.items.map((item) => item.id)).toEqual(['dispatch', 'private']);
    expect(educationHubPage.formats.items.map((item) => item.id)).toEqual([
      'regular',
      'private',
      'oneday',
      'inclusive',
    ]);
    expect(educationHubPage.formats.items.find((item) => item.id === 'oneday')?.href).toContain('/dispatch');
    expect(educationHubPage.formats.items.find((item) => item.id === 'oneday')?.href).toContain('#programs');
    expect(educationHubPage.formats.items.find((item) => item.id === 'inclusive')?.href).toContain('/dispatch');
    expect(educationHubPage.principles.spomoveCta.href).toBe(`${SPOKEDU_PATHS.spomove}`);
    expect(educationHubPage.principles.spomoveNote).toMatch(/일부 수업/);
    expect(educationHubPage.principles.spomoveNote).toMatch(/모든 수업에 포함되는 것은 아닙니다/);
    expect(educationHubPage.principles.spomoveNote).not.toMatch(/모든 수업에 포함됩니다/);
    expect(educationHubPage.cases.cards).toHaveLength(3);
    expect(educationHubPage.cases.cards.map((card) => card.slug)).toEqual([
      'yangcheon-paps',
      'dasarang-oneday',
      'donghaeng-special-pe',
    ]);
    expect(educationHubPage.cases.recordsCta.href).toBe(`${SPOKEDU_BASE_PATH}/records`);
    expect(educationHubPage.finalCta.primary.href).toBe(`${SPOKEDU_BASE_PATH}/dispatch#contact`);
    expect(educationHubPage.finalCta.secondary.href).toBe(`${SPOKEDU_BASE_PATH}/private#apply`);
    expect(educationHubPage.finalCta.contactLink.href).toBe(`${SPOKEDU_BASE_PATH}/contact`);
    expect(JSON.stringify(educationHubPage)).not.toMatch(/준비 중|곧 공개|추후 업데이트/);
    expect(JSON.stringify(educationHubPage)).not.toMatch(/SPO-MAT|치료|회복|발달 개선|향상됩니다|검증된|최고|유일/);
    expect(JSON.stringify(educationHubPage)).not.toMatch(/15,?015|9,900|3,?000회|\d+년\+/);
    expect(educationHubPage.paths.map((path) => path.id)).toEqual(['dispatch', 'private', 'oneday', 'inclusive']);
  });

  it('keeps home within seven top-level sections and current routing', () => {
    expect(homePage.sectionOrder).toHaveLength(7);
    expect([...homePage.sectionOrder]).toEqual([
      'hero',
      'paths',
      'education',
      'spomove',
      'subscription',
      'fieldProof',
      'finalAction',
    ]);
    expect(homePage.hero.lines.join(' ')).toMatch(/현장|아동체육|수업|콘텐츠|시스템/);
    expect(homePage.hero.lines.join(' ')).not.toMatch(/검증한/);
    expect(homePage.hero.primaryCta.href).toBe(`${SPOKEDU_BASE_PATH}/education`);
    expect(homePage.hero.secondaryCta.href).toBe(`${SPOKEDU_PATHS.spomove}`);
    expect(homePage.hero.recordsLink.href).toBe(`${SPOKEDU_BASE_PATH}/records`);
    expect(homePage.audienceGate.title).toMatch(/찾고/);
    expect(homePage.audienceGate.items.map((item) => item.id)).toEqual([
      'dispatch',
      'private',
      'curriculum',
      'partner',
    ]);
    expect(homePage.audienceGate.items.map((item) => item.href)).toEqual([
      `${SPOKEDU_BASE_PATH}/dispatch`,
      `${SPOKEDU_BASE_PATH}/private`,
      `${SPOKEDU_PATHS.subscription}`,
      `${SPOKEDU_BASE_PATH}/contact`,
    ]);
    expect(homePage.audienceGate.items.map((item) => item.id)).not.toContain('spomove');
    expect(homePage.pillars.items.map((item) => item.id)).toEqual(['education', 'spomove', 'curriculum']);
    expect(homePage.pillars.items.find((item) => item.id === 'education')?.href).toBe(
      `${SPOKEDU_BASE_PATH}/education`,
    );
    expect(homePage.pillars.items.find((item) => item.id === 'spomove')?.href).toBe(
      `${SPOKEDU_PATHS.spomove}`,
    );
    expect(homePage.pillars.items.find((item) => item.id === 'spomove')?.relationNote).toMatch(/공통/);
    expect(homePage.cycle.processLine).toContain('현장');
    expect(homePage.cycle.processLine).toContain('시스템');
    expect(homePage.cycle.steps).toHaveLength(4);
    expect(homePage.spomove.flowSteps).toHaveLength(4);
    expect(homePage.spomove.primaryCta.href).toBe(`${SPOKEDU_PATHS.spomove}`);
    expect(homePage.spomove.featuredCase.slug).toBe('dongjak-spomove');
    expect(homePage.spomove.lead).not.toMatch(/향상|개선|반드시 성장/);
    expect(homePage.evidenceStrip.items).toHaveLength(4);
    expect(homePage.evidenceStrip.items.some((item) => /\d+건|\d+년\+|15,?015|3,?000/.test(item.value))).toBe(
      false,
    );
    expect(homePage.finalCta.items).toHaveLength(4);
    expect(homePage.finalCta.items.map((item) => item.href)).toEqual([
      `${SPOKEDU_PATHS.education}`,
      `${SPOKEDU_PATHS.spomove}`,
      `${SPOKEDU_PATHS.subscription}`,
      `${SPOKEDU_PATHS.contact}`,
    ]);
    expect(JSON.stringify(homePage.hero)).not.toMatch(/SPO-MAT|9,900|15,015/);
    expect(JSON.stringify(homePage.pillars)).not.toMatch(/3대 사업|SPO-MAT/);
    expect(JSON.stringify(homePage.finalCta)).not.toMatch(/onboarding|스포키듀 마스터/);
  });

  it('uses the verified field cases on the home proof section', () => {
    expect(HOME_MAIN_CASE_SLUGS).toEqual(['dongjak-spomove']);
    expect(homePage.cases.cards.map((card) => card.slug)).toEqual([
      'dongjak-spomove',
      'maedong-sports-stepup',
      'donghaeng-special-pe',
    ]);
    expect(homePage.cases.cards).toHaveLength(3);
    expect(homePage.cases.recordsCta.href).toBe(`${SPOKEDU_BASE_PATH}/records`);
  });

  it('keeps home SEO aligned with the homepage positioning', () => {
    expect(seoMeta.home.title).toMatch(/체육|SPOMOVE|구독/);
    expect(seoMeta.home.description).toContain('SPOMOVE');
    expect(seoMeta.home.description).toMatch(/구독|지도자/);
    expect(seoMeta.home.description).not.toMatch(/15,?015|3,?000|최고|유일/);
  });

  it('keeps program index href valid (no self-redirect target)', () => {
    expect(HOME_PROGRAM_SYSTEM_HREF).toBe(SPOKEDU_PATHS.spomove);
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
    expect(dispatchPage.examples.items.every((item) => item.fitReason && item.review && item.proves)).toBe(true);
    expect(dispatchPage.examples.items.some((item) => item.recordSlug === 'dongjak-spomove')).toBe(true);
    expect(dispatchPage.examples.items.some((item) => item.recordSlug === 'yangcheon-paps')).toBe(true);
    expect(
      dispatchPage.examples.items
        .filter((item) => item.recordSlug)
        .every((item) => item.href.includes(`/records/${item.recordSlug}`)),
    ).toBe(true);
    expect(dispatchPage.examples.items.every((item) => !item.operation.includes('SPOMOVE') || item.recordSlug === 'dongjak-spomove')).toBe(
      true,
    );
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
    expect(privatePage.goalPaths.items.map((item) => item.id)).toEqual([
      'confidence',
      'fundamental',
      'sport-prep',
      'peer-group',
    ]);
    expect(privatePage.assignmentPolicy.steps.length).toBeGreaterThanOrEqual(3);
    expect(privatePage.heroCtas.primary.label).toContain('아이 조건');
    expect(privatePage.reviews.items[0]?.text).not.toContain('학원에내면');
  });

  it('preserves private startDirection ids as lead-contract vocabulary', () => {
    expect(PRIVATE_START_DIRECTION_OPTIONS.map((o) => o.id)).toEqual([
      'confidence',
      'fundamental',
      'sport-prep',
      'peer-group',
    ]);
    expect(PRIVATE_FORMAT_OPTIONS.map((o) => o.id)).toEqual(['one-to-one', 'small-group', 'undecided']);
  });

  it('exposes SPOMOVE static landing with dual paths and catalog fallback contracts', () => {
    expect(spomoveProgramPage.sectionOrder).toHaveLength(7);
    expect(spomoveProgramPage.hero.lines.join(' ')).toMatch(/화면|움직임|SPOMOVE/);
    expect(spomoveProgramPage.flow.steps.map((step) => step.label)).toEqual(['확인', '판단', '수행', '조절']);
    expect(spomoveProgramPage.content.levels.map((level) => level.id)).toEqual(['simple', 'choice', 'complex']);
    expect(spomoveProgramPage.content.catalogCta.href).toBe(`${SPOKEDU_PATHS.spomoveCatalog}`);
    expect(spomoveProgramPage.spomat.title).toMatch(/SPOMAT/);
    expect(spomoveProgramPage.spomat.body).toMatch(/도구/);
    expect(spomoveProgramPage.usePaths.items.map((item) => item.id)).toEqual(['institution', 'subscription']);
    expect(spomoveProgramPage.usePaths.items.find((item) => item.id === 'institution')?.href).toContain('/dispatch');
    expect(spomoveProgramPage.usePaths.items.find((item) => item.id === 'institution')?.href).toContain('program=spomove');
    expect(spomoveProgramPage.usePaths.items.find((item) => item.id === 'subscription')?.href).toBe(
      `${SPOKEDU_PATHS.subscription}`,
    );
    expect(spomoveProgramPage.usePaths.items.find((item) => item.id === 'subscription')?.href).not.toContain('onboarding');
    expect(spomoveProgramPage.cases.cards.length).toBeGreaterThanOrEqual(1);
    expect(spomoveProgramPage.cases.cards.length).toBeLessThanOrEqual(3);
    expect(spomoveProgramPage.cases.cards.every((card) => /SPOMOVE|spomove|에듀테크|반응/i.test(`${card.programLabel} ${card.description} ${card.audience}`))).toBe(
      true,
    );
    expect(spomoveProgramPage.catalogFinal.primary.href).toContain('/dispatch');
    expect(spomoveProgramPage.catalogFinal.secondary.href).toBe(`${SPOKEDU_PATHS.subscription}`);
    expect(JSON.stringify(spomoveProgramPage)).not.toMatch(/SPO-MAT|집중력이 향상|인지능력이|발달 회복|치료 효과|검증된 효과|9,900|15,?015/);
    expect(spomoveProgramPage.usePaths.items[0]?.body).toMatch(/필수는 아닙니다/);
    expect(spomoveProgramPage.usePaths.items[0]?.body).not.toMatch(/필수로 포함됩니다|반드시 포함/);
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
      expect(block.finalCtaSub.length).toBeGreaterThan(10);
      expect(block.primaryCta.href).not.toContain('/contact');
    }
  });

  it('exposes contact expect guide checklist', () => {
    expect(contactPageContent.expectGuide.items.length).toBeGreaterThanOrEqual(4);
    expect(contactPageContent.expectGuide.responseNote).toContain('영업일');
  });
});

describe('spokedu Phase 3 public-copy safety', () => {
  it('keeps marketing surfaces free of unverified counters, hard prices, and SPO-MAT', () => {
    const tabsSource = readFileSync(
      join(process.cwd(), 'app/spokedu/components/spomove-catalog-tabs.tsx'),
      'utf8',
    );
    const siteSource = readFileSync(join(process.cwd(), 'app/spokedu/data/site.ts'), 'utf8');
    const chromeSource = readFileSync(join(process.cwd(), 'app/spokedu/components/site-chrome.tsx'), 'utf8');

    for (const key of [
      'PRIVATE_COUNTER_BASE_DATE',
      'PRIVATE_COUNTER_BASE_STUDENTS',
      'PRIVATE_COUNTER_BASE_SESSIONS',
      'PRIVATE_COUNTER_DAILY_STUDENTS',
      'PRIVATE_COUNTER_DAILY_SESSIONS',
    ] as const) {
      expect(privateModule).not.toHaveProperty(key);
    }
    expect(privatePage.instructors.title).not.toMatch(/검증된/);
    expect(aboutFounder.credentials.join(' ')).not.toMatch(/3,?000/);
    expect(tabsSource).not.toMatch(/SPO-MAT/);
    expect(tabsSource).not.toMatch(/9,900|28,900|20,900|15,900|108,900|289,000/);
    expect(tabsSource).toMatch(/SPOMAT/);
    expect(siteSource).not.toMatch(/SPO-MAT/);
    expect(chromeSource).not.toMatch(/SPO-MAT/);
    expect(siteSource).not.toMatch(/프리랜서|다른 업체|기본 업체/);
    expect(chromeSource).not.toMatch(/9,900|28,900|20,900|15,900/);

    // curriculum 허브는 공개 계약에서만 가격을 렌더 — 소스에 숫자 하드코딩 금지
    const curriculumPageSource = readFileSync(
      join(process.cwd(), 'app/spokedu/data/curriculum-page.ts'),
      'utf8',
    );
    const curriculumLandingSource = readFileSync(
      join(process.cwd(), 'app/spokedu/components/curriculum-landing.tsx'),
      'utf8',
    );
    expect(curriculumPageSource).not.toMatch(/\b9900\b|\b28900\b|9,?900|28,?900/);
    expect(curriculumLandingSource).not.toMatch(/\b9900\b|\b28900\b|9,?900|28,?900/);
    expect(curriculumPageSource).not.toMatch(/productCatalog/);
    expect(curriculumLandingSource).not.toMatch(/productCatalog/);
    expect(curriculumLandingSource).toMatch(/getPublicProductContract/);

    const homeSource = readFileSync(join(process.cwd(), 'app/spokedu/data/home-page.ts'), 'utf8');
    const homeLandingSource = readFileSync(
      join(process.cwd(), 'app/spokedu/components/home-landing.tsx'),
      'utf8',
    );
    const spomoveLandingSource = readFileSync(
      join(process.cwd(), 'app/spokedu/components/spomove-program-landing.tsx'),
      'utf8',
    );
    const spomovePageSource = readFileSync(
      join(process.cwd(), 'app/spokedu/programs/spomove/page.tsx'),
      'utf8',
    );
    const catalogPageSource = readFileSync(
      join(process.cwd(), 'app/spokedu/programs/spomove/catalog/page.tsx'),
      'utf8',
    );
    expect(homeSource).not.toMatch(/SPO-MAT/);
    expect(homeSource).not.toMatch(/15,?015|PRIVATE_COUNTER|3,?000회/);
    expect(homeSource).not.toMatch(/9,900|28,900|20,900|15,900/);
    expect(homeLandingSource).not.toMatch(/HomePartnerReviews|HomeMediaRail/);
    expect(homeLandingSource).toMatch(/HomeServices/);
    expect(homeLandingSource).toMatch(/HomeWhySpokedu/);
    expect(homeLandingSource).toMatch(/HomeFieldRecords/);
    expect(spomoveLandingSource).toMatch(/SpomoveProgramLanding|data-spokedu-spomove-sections/);
    expect(spomoveLandingSource).not.toMatch(/SPO-MAT/);
    expect(spomoveLandingSource).not.toMatch(/9,900|28,900|집중력이 향상|인지능력이 개선/);
    expect(spomovePageSource).toMatch(/SpomoveProgramLanding/);
    expect(catalogPageSource).toMatch(/title=\"SPOMOVE 전체 프로그램 카탈로그\"|title='SPOMOVE 전체 프로그램 카탈로그'/);
    expect(catalogPageSource).toMatch(/SPOMOVE 소개로 돌아가기|SPOMOVE 소개/);
    expect(catalogPageSource).toMatch(/구독시스템 알아보기/);
  });

  it('keeps redirect-only program routes in next.config', () => {
    const configSource = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    for (const path of REDIRECT_ONLY_PROGRAM_PATHS) {
      expect(configSource).toContain(path);
    }
  });
});
