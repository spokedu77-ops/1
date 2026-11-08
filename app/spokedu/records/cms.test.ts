import { beforeEach, describe, expect, it, vi } from 'vitest';
import seed from '@/app/lib/field-records/approved-seed.json';
import { publicRecordContent, recordContentSchema, type PublicFieldRecord } from '@/app/lib/field-records/contract';
const mocks = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn(), enabled: vi.fn(() => true) }));
vi.mock('@/app/lib/server/fieldRecords', () => ({ fieldRecordsCmsEnabled: mocks.enabled, getPublishedFieldRecord: mocks.get, listPublishedFieldRecords: mocks.list }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
import DetailPage, { generateMetadata } from './[slug]/page';
import sitemap from '@/app/sitemap';
const content = publicRecordContent(recordContentSchema.parse(seed.records[0].content));
const record: PublicFieldRecord = { id: 'id', slug: seed.records[0].slug, content, featuredSlot: 1, publishedAt: '2026-11-07T00:00:00Z', updatedAt: '2026-11-07T00:00:00Z' };
beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(record); mocks.list.mockResolvedValue([record]); });
describe('CMS detail SEO and withdrawal', () => {
  it('builds title, canonical, description and OG image from the same published snapshot', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: record.slug }) });
    expect(metadata.title).toBe(content.seoTitle);
    expect(metadata.description).toBe(content.seoDescription);
    expect(metadata.alternates?.canonical).toBe(`/records/${record.slug}`);
    expect(JSON.stringify(metadata.openGraph)).toContain(content.hero!.alt);
  });
  it('returns 404 instead of showing a legacy version of an unpublished migrated case', async () => {
    mocks.get.mockResolvedValue(null);
    const params = { params: Promise.resolve({ slug: record.slug }) };
    await expect(DetailPage(params)).rejects.toThrow('NOT_FOUND');
    await expect(generateMetadata(params)).rejects.toThrow('NOT_FOUND');
  });
  it('adds only published CMS details to the sitemap and removes withdrawn ones', async () => {
    let entries = await sitemap();
    expect(entries.some(item => item.url.endsWith(`/records/${record.slug}`))).toBe(true);
    expect(entries.some(item => item.url.endsWith('/records/dongjak-spomove'))).toBe(false);
    mocks.list.mockResolvedValue([]); entries = await sitemap();
    expect(entries.some(item => item.url.endsWith(`/records/${record.slug}`))).toBe(false);
  });
});
