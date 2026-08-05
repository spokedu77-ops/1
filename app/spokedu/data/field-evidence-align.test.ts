import { describe, expect, it } from 'vitest';
import {
  FIELD_RECORD_CATALOG,
  hasFieldRecordOnsiteSummary,
  type FieldRecordRelevantRoute,
} from './field-records-catalog';
import { getRecordConversionHref } from './commercial-routes';
import { programDetailBlocks } from './program-details';

const ROUTES: readonly FieldRecordRelevantRoute[] = ['dispatch', 'private', 'curriculum'];

describe('field evidence catalog alignment', () => {
  it('requires proves, relevantRoutes, and strength on every curated slug', () => {
    for (const item of FIELD_RECORD_CATALOG) {
      expect(item.proves.length).toBeGreaterThan(0);
      expect(item.relevantRoutes.length).toBeGreaterThan(0);
      expect(['primary', 'supporting']).toContain(item.strength);
      for (const route of item.relevantRoutes) {
        expect(ROUTES).toContain(route);
      }
    }
  });

  it('keeps program detail fieldRecordSlugs inside the catalog SSOT', () => {
    const catalogSlugs = new Set(FIELD_RECORD_CATALOG.map((item) => item.slug));
    for (const [slug, block] of Object.entries(programDetailBlocks)) {
      expect(block.fieldRecordSlugs.length, slug).toBeGreaterThan(0);
      for (const recordSlug of block.fieldRecordSlugs) {
        expect(catalogSlugs.has(recordSlug), `${slug}:${recordSlug}`).toBe(true);
      }
    }
  });

  it('exposes reverse commercial CTA only for onsite records', () => {
    for (const item of FIELD_RECORD_CATALOG) {
      const href = getRecordConversionHref(item.slug);
      if (hasFieldRecordOnsiteSummary(item)) {
        expect(href).toContain('/dispatch');
        expect(item.relevantRoutes).toContain('dispatch');
      } else {
        expect(href).toBeNull();
        expect(item.href).toMatch(/^https:\/\/blog\.naver\.com\//);
      }
    }
  });
});
