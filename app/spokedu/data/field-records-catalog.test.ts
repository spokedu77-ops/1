import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildHomeFieldRecordCards,
  buildRecordsHeroSummary,
  buildRecordsPageFieldRecords,
  FIELD_RECORD_CATALOG,
  getFieldRecordCatalogItem,
  getFieldRecordOnsitePath,
  hasFieldRecordOnsiteSummary,
  HOME_FEATURED_FIELD_RECORD_SLUGS,
} from './field-records-catalog';

const REMOTE_MEDIA_RE = /https?:\/\/|pstatic\.net|blog\.naver\.com|postfiles\.|blogfiles\.|blogthumb\./i;

const RUNTIME_GUARD_SOURCES = [
  'app/spokedu/lib/resolve-field-records.ts',
  'app/spokedu/components/home/home-field-records.tsx',
  'app/spokedu/components/records-landing.tsx',
  'app/spokedu/components/records-case-detail.tsx',
  'app/spokedu/data/field-records-catalog.ts',
] as const;

describe('field-records-catalog', () => {
  it('exposes the same primary href for home featured slugs and records entries', () => {
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

  it('keeps onsite summaries for home featured cases with blog as secondary link', () => {
    for (const slug of HOME_FEATURED_FIELD_RECORD_SLUGS) {
      const catalog = getFieldRecordCatalogItem(slug);
      expect(hasFieldRecordOnsiteSummary(catalog)).toBe(true);
      expect(catalog.href).toBe(getFieldRecordOnsitePath(slug));
      expect(catalog.href.startsWith('/spokedu/records/')).toBe(true);
      expect(catalog.blogHref).toMatch(/^https:\/\/blog\.naver\.com\//);
      expect(catalog.onsite!.composition.length).toBeGreaterThanOrEqual(2);
      expect(catalog.thumbnailSrc).toMatch(/^\/images\/spokedu\/records\//);
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
      expect(item.thumbnailSrc).toBeTruthy();
      expect(item.thumbnailSrc).toMatch(/^\/images\/spokedu\/records\/[a-z0-9-]+\.(jpe?g|png|webp)$/i);
      expect(item.thumbnailSrc).toContain(item.slug);
      expect(item.thumbnailSrc).not.toMatch(REMOTE_MEDIA_RE);
    }
  });

  it('blocks runtime remote media fetch paths that would API-bomb Naver/pstatic', () => {
    for (const relative of RUNTIME_GUARD_SOURCES) {
      const source = readFileSync(join(process.cwd(), relative), 'utf8');
      // thumbnailSrc에 원격 URL을 넣거나, 렌더 경로에서 pstatic/naver 이미지를 fetch 하면 안 됨
      expect(source).not.toMatch(/thumbnailSrc:\s*[`'"]https?:\/\//);
      expect(source).not.toMatch(/fetch\(\s*[`'"]https?:\/\/[^`'"]*(?:pstatic\.net|blog\.naver\.com)/);
      expect(source).not.toMatch(/new\s+Image\(\)[\s\S]{0,120}pstatic\.net/);
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
