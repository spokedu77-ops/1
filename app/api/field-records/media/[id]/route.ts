import { z } from 'zod';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { fieldRecordsCmsEnabled, publishedMedia } from '@/app/lib/server/fieldRecords';
import { FIELD_RECORD_MEDIA_BUCKET } from '@/app/lib/server/fieldRecordsAdmin';
import { recordContentSchema } from '@/app/lib/field-records/contract';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const missing = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const { id } = await params;
  if (!fieldRecordsCmsEnabled() || !z.string().uuid().safeParse(id).success) return missing();
  const db = getServiceSupabase();
  const { data: media } = await db.from('field_record_media').select('record_id,object_path').eq('id', id).maybeSingle();
  if (!media) return missing();
  const { data: row } = await db.from('field_records').select('published_content').eq('id', media.record_id).not('published_content', 'is', null).maybeSingle();
  const parsed = recordContentSchema.safeParse(row?.published_content);
  if (!parsed.success || !publishedMedia(parsed.data, id)) return missing();
  const { data: blob, error } = await db.storage.from(FIELD_RECORD_MEDIA_BUCKET).download(media.object_path);
  if (error || !blob) return missing();
  return new Response(blob, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
