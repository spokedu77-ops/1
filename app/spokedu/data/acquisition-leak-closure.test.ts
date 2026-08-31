import { describe, expect, it } from 'vitest';
import {
  DISPATCH_PROGRAM_OPTIONS,
  DISPATCH_PROGRAM_QUERY_MAP,
  getRecordConversionHref,
  parseConversionEvidenceSlug,
  parseDispatchProgramLabel,
} from './commercial-routes';
import { FIELD_RECORD_CATALOG, hasFieldRecordOnsiteSummary } from './field-records-catalog';
import { homePage } from './home-page';
import {
  programCommercialCtaRoutesDiffer,
  programDetailBlocks,
} from './program-details';
import { programRegistry } from './programs-catalog';
import { SPOKEDU_PATHS } from './site';

describe('acquisition leak closure', () => {
  it('keeps home choice focused on two commercial paths without sub-navigation', () => {
    expect(homePage.choice.education.headline).toBe('체육수업');
    expect(homePage.choice.subscription.tagline).toMatch(/직접 수업/);
    expect('links' in homePage.choice.education).toBe(false);
    expect(JSON.stringify(homePage.choice)).not.toContain('/dispatch');
    expect(JSON.stringify(homePage.choice)).not.toContain('/private');
    expect(homePage.hero.primaryCta.label).toBe('체육수업 알아보기');
    expect(homePage.contact.primaryCta.label).toBe('문의하기');
    expect(JSON.stringify(homePage.contact)).not.toMatch(/체육수업 알아보기|구독시스템 알아보기/);
  });

  it('removes contact type links from program commercial CTAs', () => {
    for (const block of Object.values(programDetailBlocks)) {
      expect(block.primaryCta.href).not.toContain('/contact');
      if (block.secondaryCta) {
        expect(block.secondaryCta.href).not.toContain('/contact?type=');
      }
    }
    for (const item of programRegistry) {
      expect(item.inquiryHref).not.toContain('/contact?type=');
    }
  });

  it('allows a second program CTA only when it targets a different route', () => {
    for (const [slug, block] of Object.entries(programDetailBlocks)) {
      expect(programCommercialCtaRoutesDiffer(block), slug).toBe(true);
    }
  });

  it('maps every program query id to an existing dispatch option', () => {
    for (const label of Object.values(DISPATCH_PROGRAM_QUERY_MAP)) {
      expect(DISPATCH_PROGRAM_OPTIONS).toContain(label);
    }
    expect(parseDispatchProgramLabel('spomove')).toBe('SPOMOVE');
    expect(parseDispatchProgramLabel('paps')).toBe('PAPS 놀이체육');
    expect(parseDispatchProgramLabel('unknown-program')).toBeNull();
  });

  it('accepts only FieldRecordSlug conversionEvidence values', () => {
    expect(parseConversionEvidenceSlug('dongjak-spomove')).toBe('dongjak-spomove');
    expect(parseConversionEvidenceSlug('unknown')).toBeNull();
    expect(parseConversionEvidenceSlug('광주세미나')).toBeNull();
  });

  it('builds onsite reverse conversion href only when onsite summary exists', () => {
    for (const item of FIELD_RECORD_CATALOG) {
      const href = getRecordConversionHref(item.slug);
      if (hasFieldRecordOnsiteSummary(item)) {
        expect(href).toBeTruthy();
        expect(href).toContain('/dispatch');
        expect(href).toContain(`conversionEvidence=${item.slug}`);
        expect(href).not.toContain('/contact');
      } else {
        expect(href).toBeNull();
      }
    }
  });

  it('routes home commercial CTAs into structured landings without repeating choice at contact', () => {
    expect(homePage.spomove.primaryCta.href).toBe(`${SPOKEDU_PATHS.spomove}`);
    expect(homePage.hero.primaryCta.href).toBe(`${SPOKEDU_PATHS.education}`);
    expect(homePage.hero.secondaryCta.href).toBe(`${SPOKEDU_PATHS.subscription}`);
    expect(homePage.contact.primaryCta.href).toBe(`${SPOKEDU_PATHS.contact}`);
    expect('secondaryCta' in homePage.contact).toBe(false);
    expect(JSON.stringify(homePage.contact)).not.toMatch(/onboarding/);
    expect(JSON.stringify(homePage.contact)).not.toMatch(/체육수업 알아보기|구독시스템 알아보기|운영 사례 더 보기/);
  });
});
