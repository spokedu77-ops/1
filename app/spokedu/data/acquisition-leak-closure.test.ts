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
import { SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';

describe('acquisition leak closure', () => {
  it('keeps home audience gates on marketing routes without query noise', () => {
    expect(homePage.audienceGate.items.map((item) => item.href)).toEqual([
      `${SPOKEDU_BASE_PATH}/dispatch`,
      `${SPOKEDU_BASE_PATH}/private`,
      `${SPOKEDU_PATHS.subscription}`,
      `${SPOKEDU_BASE_PATH}/contact`,
    ]);
    for (const item of homePage.audienceGate.items) {
      expect(item.href).not.toMatch(/[?#]/);
      expect(item.href).not.toContain('/spokedu-master');
      expect(item.href).not.toContain('onboarding');
    }
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

  it('routes home commercial CTAs into structured landings', () => {
    expect(homePage.spomove.primaryCta.href).toBe(`${SPOKEDU_PATHS.spomove}`);
    expect(homePage.spomove.secondaryCta.href).toBe(`${SPOKEDU_BASE_PATH}/records`);
    expect(homePage.cases.consultCta.href).toBe(`${SPOKEDU_BASE_PATH}/dispatch`);
    expect(homePage.finalCta.items.map((item) => item.href)).toEqual([
      `${SPOKEDU_PATHS.education}`,
      `${SPOKEDU_PATHS.spomove}`,
      `${SPOKEDU_PATHS.subscription}`,
      `${SPOKEDU_PATHS.contact}`,
    ]);
    expect(homePage.finalCta.items.every((item) => !item.href.includes('onboarding'))).toBe(true);
  });
});
