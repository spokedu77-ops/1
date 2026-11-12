import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { adminJson, assertOwnedMedia, blogDraftError, draftRow, mediaIdsInDoc, recordDraftRevision, rejectForeignOrigin } from '@/app/lib/server/blogDraftsAdmin';
import { blogDraftWriteSchema } from '@/app/lib/blog-drafts/contract';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const db = getServiceSupabase();
  const { data, error } = await db.from('blog_drafts').select('id,title,content,category,tags,status,excerpt,featured_image,published_url,published_at,author_id,revision,created_at,updated_at').eq('id', id).maybeSingle();
  if (error) return adminJson({ error: '원고를 불러오지 못했습니다.' }, 503);
  if (!data) return adminJson({ error: '원고를 찾을 수 없습니다.' }, 404);
  const { data: user } = await db.auth.admin.getUserById(data.author_id);
  const { count } = await db.from('blog_draft_revisions').select('id', { count: 'exact', head: true }).eq('draft_id', id);
  return adminJson({ draft: { ...data, author_name: user.user?.email?.split('@')[0] ?? '관리자', revision_count: count ?? 0 } });
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  try {
    const input = blogDraftWriteSchema.parse(await request.json());
    if (!input.revision) return adminJson({ error: '저장 버전이 필요합니다.' }, 400);
    if (input.status === 'published' && (!input.publishedUrl || !input.publishedAt)) {
      return adminJson({ error: '발행 완료로 표시하려면 게시 URL과 발행일이 필요합니다.' }, 400);
    }
    const mediaIds = mediaIdsInDoc(input.content);
    if (input.featuredImage) mediaIds.push(input.featuredImage);
    await assertOwnedMedia(id, mediaIds);
    const db = getServiceSupabase();
    const next = draftRow(input, auth.userId);
    const patch = { ...next };
    Reflect.deleteProperty(patch, 'author_id');
    const { data, error } = await db.from('blog_drafts').update({ ...patch, revision: input.revision + 1 }).eq('id', id).eq('revision', input.revision).select('id,revision,updated_at,status').maybeSingle();
    if (error) return adminJson({ error: '원고를 저장하지 못했습니다.' }, 503);
    if (!data) throw new Error('REVISION_CONFLICT');
    const revisionSaved = await recordDraftRevision(id, input.content, data.revision, auth.userId);
    return adminJson({ draft: data, revisionSaved });
  } catch (error) {
    return blogDraftError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  const db = getServiceSupabase();
  const { data: media } = await db.from('blog_draft_media').select('object_path').eq('draft_id', id);
  const { error } = await db.from('blog_drafts').delete().eq('id', id);
  if (error) return adminJson({ error: '원고를 삭제하지 못했습니다. 대표 이미지 연결을 먼저 해제해 주세요.' }, 409);
  const paths = (media ?? []).map(item => item.object_path);
  if (paths.length) await db.storage.from('blog-draft-media').remove(paths);
  return adminJson({ ok: true });
}
