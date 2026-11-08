import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import seed from '@/app/lib/field-records/approved-seed.json';
import { recordContentSchema } from '@/app/lib/field-records/contract';
const mocks = vi.hoisted(() => ({ data: [] as unknown[], select: vi.fn(), connection: vi.fn(), from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: mocks.connection }));
vi.mock('./adminAuth', () => ({ getServiceSupabase: () => ({ from: mocks.from }) }));
import { getFeaturedRecordCards, listPublicRecordCards, listPublishedFieldRecords, publishedMedia } from './fieldRecords';

beforeEach(() => {
  vi.stubEnv('FIELD_RECORDS_CMS_ENABLED', 'true'); mocks.data = []; vi.clearAllMocks();
  const chain = { select: mocks.select, not: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn(async () => ({ data: mocks.data, error: null })) };
  mocks.select.mockReturnValue(chain); mocks.from.mockReturnValue(chain);
});
afterEach(() => vi.unstubAllEnvs());
describe('field record public repository', () => {
  it('never selects draft columns and never falls back to migrated withdrawn records', async () => {
    expect(await listPublishedFieldRecords()).toEqual([]);
    expect(mocks.select).toHaveBeenCalledWith('id,slug,published_content,featured_slot,published_at,updated_at');
    const cards = await listPublicRecordCards();
    for (const item of seed.records) expect(cards.some(card => card.slug === item.slug)).toBe(false);
    expect(await getFeaturedRecordCards()).toEqual([]);
  });
  it('uses explicit featured positions rather than publication order', async () => {
    mocks.data = seed.records.map((item, index) => ({ id: `${index}`, slug: item.slug, published_content: item.content, featured_slot: index === 1 ? null : index === 0 ? 3 : 1, published_at: '2026-11-07T00:00:00Z', updated_at: '2026-11-07T00:00:00Z' }));
    const cards = await getFeaturedRecordCards();
    expect(cards.map(card => card.slug)).toEqual(['donghaeng-special-pe', 'maedong-sports-stepup']);
  });
  it('keeps the current site while the rollout switch is disabled', async () => {
    vi.stubEnv('FIELD_RECORDS_CMS_ENABLED', 'false');
    expect(await getFeaturedRecordCards()).toHaveLength(3);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('does not serve unapproved or hidden gallery media', () => {
    const content = recordContentSchema.parse(seed.records[0].content); const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    content.gallery = [{ id, alt: '사진', caption: '', publicConfirmed: true }];
    expect(publishedMedia(content, id)).toBe(false);
    content.imagePublicConfirmed = true; expect(publishedMedia(content, id)).toBe(true);
    content.sections.find(item => item.id === 'gallery')!.visible = false;
    expect(publishedMedia(content, id)).toBe(false);
  });
});
