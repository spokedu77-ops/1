import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { BLOG_DRAFT_MEDIA_BUCKET, adminJson, rejectForeignOrigin } from '@/app/lib/server/blogDraftsAdmin';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const db = getServiceSupabase();
  const { data } = await db.from('blog_draft_media').select('object_path,mime_type').eq('id', id).maybeSingle();
  if (!data) return adminJson({ error: '이미지를 찾을 수 없습니다.' }, 404);
  const file = await db.storage.from(BLOG_DRAFT_MEDIA_BUCKET).download(data.object_path);
  if (file.error || !file.data) return adminJson({ error: '이미지를 불러오지 못했습니다.' }, 503);
  return new Response(file.data, { headers: { 'Content-Type': data.mime_type, 'Cache-Control': 'private, max-age=3600', 'X-Robots-Tag': 'noindex' } });
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  const db = getServiceSupabase();
  const { data: media } = await db.from('blog_draft_media').select('id,draft_id,object_path').eq('id', id).maybeSingle();
  if (!media) return adminJson({ error: '이미지를 찾을 수 없습니다.' }, 404);
  const { data: draft } = await db.from('blog_drafts').select('content,featured_image').eq('id', media.draft_id).maybeSingle();
  const used = draft?.featured_image === id || JSON.stringify(draft?.content ?? {}).includes(id);
  if (used) return adminJson({ error: '본문이나 대표 이미지에서 사용 중입니다. 뺀 뒤 저장하고 삭제해 주세요.' }, 409);
  const { error } = await db.from('blog_draft_media').delete().eq('id', id);
  if (error) return adminJson({ error: '이미지를 삭제하지 못했습니다.' }, 503);
  await db.storage.from(BLOG_DRAFT_MEDIA_BUCKET).remove([media.object_path]);
  return adminJson({ ok: true });
}
