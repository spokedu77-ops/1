import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { FIELD_RECORD_MEDIA_BUCKET, adminJson, rejectForeignOrigin } from '@/app/lib/server/fieldRecordsAdmin';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get('recordId');
  if (!z.string().uuid().safeParse(id).success) return adminJson({ error: '기록 ID가 필요합니다.' }, 400);
  const { data, error } = await getServiceSupabase().from('field_record_media').select('id,created_at').eq('record_id', id).order('created_at', { ascending: false }).limit(200);
  if (error) return adminJson({ error: '사진 목록을 불러오지 못했습니다.' }, 503);
  return adminJson({ media: data });
}
export async function POST(request: Request) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request); if (originError) return originError;
  if (Number(request.headers.get('content-length') ?? 0) > 11 * 1024 * 1024) return adminJson({ error: '사진은 10MB 이하로 업로드해 주세요.' }, 413);
  try {
    const form = await request.formData(); const recordId = form.get('recordId'); const file = form.get('file');
    if (!z.string().uuid().safeParse(recordId).success || !(file instanceof File) || file.size < 1 || file.size > 10 * 1024 * 1024) return adminJson({ error: '기록과 10MB 이하의 사진이 필요합니다.' }, 400);
    const db = getServiceSupabase();
    const { data: record, error: lookupError } = await db.from('field_records').select('id').eq('id', recordId).maybeSingle();
    if (lookupError || !record) return adminJson({ error: '먼저 초안을 저장해 주세요.' }, 404);
    const input = new Uint8Array(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 45_000_000 }); const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) return adminJson({ error: '정지 JPG·PNG·WebP 사진만 사용할 수 있습니다.' }, 400);
    // Strip EXIF/GPS, correct orientation, preserve aspect ratio; no arbitrary client object paths.
    const bytes = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    const id = randomUUID(); const objectPath = `${recordId}/${id}.webp`;
    const { error: uploadError } = await db.storage.from(FIELD_RECORD_MEDIA_BUCKET).upload(objectPath, bytes, { contentType: 'image/webp', upsert: false });
    if (uploadError) return adminJson({ error: '비공개 사진 업로드에 실패했습니다.' }, 503);
    const { error } = await db.from('field_record_media').insert({ id, record_id: recordId, object_path: objectPath, mime_type: 'image/webp', byte_size: bytes.length, created_by: auth.userId });
    if (error) { await db.storage.from(FIELD_RECORD_MEDIA_BUCKET).remove([objectPath]); return adminJson({ error: '사진 정보를 저장하지 못했습니다.' }, 503); }
    return adminJson({ media: { id, alt: '', caption: '', publicConfirmed: false } }, 201);
  } catch { return adminJson({ error: '사진 형식이나 크기를 확인해 주세요.' }, 400); }
}
