import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { FIELD_RECORD_MEDIA_BUCKET, adminJson, noStoreHeaders, rejectForeignOrigin } from '@/app/lib/server/fieldRecordsAdmin';

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return adminJson({ error: '사진이 없습니다.' }, 404);
  const db = getServiceSupabase(); const { data } = await db.from('field_record_media').select('object_path').eq('id', id).maybeSingle();
  if (!data) return adminJson({ error: '사진이 없습니다.' }, 404);
  const { data: blob, error } = await db.storage.from(FIELD_RECORD_MEDIA_BUCKET).download(data.object_path);
  if (error || !blob) return adminJson({ error: '사진이 없습니다.' }, 404);
  return new Response(blob, { headers: { ...noStoreHeaders, 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' } });
}
export async function DELETE(request: Request, context: Context) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request); if (originError) return originError;
  const { id } = await context.params; if (!z.string().uuid().safeParse(id).success) return adminJson({ error: '잘못된 사진 ID입니다.' }, 400);
  const db = getServiceSupabase(); const { data, error } = await db.rpc('delete_field_record_media', { p_id: id });
  if (error) return adminJson({ error: '본문·대표 사진·공개본에서 사용 중인 사진은 삭제할 수 없습니다. 연결 해제 후 저장하거나 게시를 취소해 주세요.' }, 409);
  const { error: storageError } = await db.storage.from(FIELD_RECORD_MEDIA_BUCKET).remove([String(data)]);
  return storageError ? adminJson({ error: '사진 연결은 삭제됐지만 저장소 파일 정리가 필요합니다.' }, 503) : adminJson({ ok: true });
}
