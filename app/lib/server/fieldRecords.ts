import 'server-only';
import { connection } from 'next/server';
import { getServiceSupabase } from './adminAuth';
import { MIGRATED_RECORD_SLUGS, publicRecordContent, recordContentSchema, type PublicFieldRecord, type RecordContent } from '@/app/lib/field-records/contract';

export const fieldRecordsCmsEnabled = () => process.env.FIELD_RECORDS_CMS_ENABLED === 'true';
export { legacyRecordCards, cmsRecordCard } from '@/app/lib/field-records/cards';
import { legacyRecordCards, cmsRecordCard, type RecordCard } from '@/app/lib/field-records/cards';

type PublishedRow = { id: string; slug: string; published_content: unknown; featured_slot: number | null; published_at: string; updated_at: string };
function toPublic(row: PublishedRow): PublicFieldRecord {
  const content = recordContentSchema.parse(row.published_content);
  return { id: row.id, slug: row.slug, content: publicRecordContent(content), featuredSlot: row.featured_slot, publishedAt: row.published_at, updatedAt: row.updated_at };
}
const PUBLIC_COLUMNS = 'id,slug,published_content,featured_slot,published_at,updated_at';

export async function listPublishedFieldRecords(): Promise<PublicFieldRecord[]> {
  if (!fieldRecordsCmsEnabled()) return [];
  await connection();
  const { data, error } = await getServiceSupabase().from('field_records').select(PUBLIC_COLUMNS).not('published_content', 'is', null).order('published_at', { ascending: false }).limit(1000);
  if (error) throw new Error('현장 기록을 불러오지 못했습니다.');
  if (data.length === 1000) throw new Error('현장 기록 조회 범위를 초과했습니다.');
  return (data as PublishedRow[]).map(toPublic);
}
export async function getPublishedFieldRecord(slug: string): Promise<PublicFieldRecord | null> {
  if (!fieldRecordsCmsEnabled()) return null;
  await connection();
  const { data, error } = await getServiceSupabase().from('field_records').select(PUBLIC_COLUMNS).eq('slug', slug).not('published_content', 'is', null).maybeSingle();
  if (error) throw new Error('현장 기록을 불러오지 못했습니다.');
  return data ? toPublic(data as PublishedRow) : null;
}
export async function listPublicRecordCards(): Promise<RecordCard[]> {
  const legacy = legacyRecordCards();
  if (!fieldRecordsCmsEnabled()) return legacy;
  const records = await listPublishedFieldRecords();
  const owned = new Set<string>([...MIGRATED_RECORD_SLUGS, ...records.map(item => item.slug)]);
  return [...records.map(cmsRecordCard), ...legacy.filter(item => !owned.has(item.slug))];
}
export async function getFeaturedRecordCards(): Promise<RecordCard[]> {
  if (!fieldRecordsCmsEnabled()) return MIGRATED_RECORD_SLUGS.flatMap(slug => legacyRecordCards().filter(item => item.slug === slug));
  return (await listPublishedFieldRecords()).filter(item => item.featuredSlot !== null).sort((a, b) => a.featuredSlot! - b.featuredSlot!).map(cmsRecordCard);
}

export function publishedMedia(content: RecordContent | null, id: string): boolean {
  return Boolean(content?.imagePublicConfirmed && [content.hero, ...(content.sections.some(section => section.id === 'gallery' && section.visible) ? content.gallery : [])].some(media => media?.id === id && media.publicConfirmed));
}
