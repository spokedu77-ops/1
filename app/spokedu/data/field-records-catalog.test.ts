import { describe, expect, it } from 'vitest';
import {
  buildHomeFieldRecordCards,
  buildRecordsHeroSummary,
  buildRecordsPageFieldRecords,
  FIELD_RECORD_CATALOG,
  getFieldRecordCatalogItem,
  HOME_FEATURED_FIELD_RECORD_SLUGS,
} from './field-records-catalog';

describe('field-records-catalog', () => {
  it('exposes the same blog URLs for home featured slugs and records entries', () => {
    for (const slug of HOME_FEATURED_FIELD_RECORD_SLUGS) {
      const catalog = getFieldRecordCatalogItem(slug);
      const homeCard = buildHomeFieldRecordCards().find((c) => c.slug === slug);
      const recordsItem = buildRecordsPageFieldRecords().find((r) => r.slug === slug);
      expect(homeCard).toBeDefined();
      expect(recordsItem).toBeDefined();
      expect(homeCard!.href).toBe(catalog.href);
      expect(recordsItem!.href).toBe(catalog.href);
      expect(homeCard!.venue).toBe(recordsItem!.venue);
      expect(homeCard!.sessionLine).toBe(recordsItem!.meta);
      expect(homeCard!.tagline).toBe(catalog.programLabel);
      expect(homeCard!.mediaKey).toBe(recordsItem!.mediaKey);
    }
  });

  it('maps dongjak to SPOMOVE and yangcheon to PAPS (not swapped)', () => {
    const dongjak = getFieldRecordCatalogItem('dongjak-spomove');
    const yangcheon = getFieldRecordCatalogItem('yangcheon-paps');
    expect(dongjak.programLabel).toBe('SPOMOVE');
    expect(dongjak.mediaKey).toBe('proofDongjak');
    expect(yangcheon.programLabel).toBe('PAPS');
    expect(yangcheon.mediaKey).toBe('proofYangcheon');
  });

  it('uses proofDasarang media for dasarang oneday', () => {
    const dasarang = getFieldRecordCatalogItem('dasarang-oneday');
    expect(dasarang.mediaKey).toBe('proofDasarang');
  });

  it('keeps catalog slugs unique', () => {
    const slugs = FIELD_RECORD_CATALOG.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('pins local thumbnailSrc for every catalog item (no runtime Naver fetch)', () => {
    for (const item of FIELD_RECORD_CATALOG) {
      expect(item.thumbnailSrc).toMatch(/^\/images\/spokedu\/records\//);
      expect(item.thumbnailSrc).toContain(item.slug);
    }
  });

  it('derives records hero stats from catalog (no stale hardcoded counts)', () => {
    const summary = buildRecordsHeroSummary();
    expect(summary.caseCount).toBe(FIELD_RECORD_CATALOG.length);
    expect(summary.venueTypeCount).toBe(summary.venueTypes.length);
    expect(summary.caseCount).toBeGreaterThanOrEqual(8);
    expect(summary.venueTypes).toEqual(
      expect.arrayContaining(['키움센터', '학교', '보건소', '주민센터']),
    );
  });
});
