import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { BLOG_DRAFT_MEDIA_BUCKET, adminJson, rejectForeignOrigin } from '@/app/lib/server/blogDraftsAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request);
  if (originError) return originError;
  if (Number(request.headers.get('content-length') ?? 0) > 11 * 1024 * 1024) return adminJson({ error: '이미지는 10MB 이하로 올려 주세요.' }, 413);
  try {
    const form = await request.formData();
    const draftId = form.get('draftId');
    const file = form.get('file');
    if (!z.string().uuid().safeParse(draftId).success || !(file instanceof File) || file.size < 1 || file.size > 10 * 1024 * 1024) {
      return adminJson({ error: '저장된 원고와 10MB 이하의 이미지가 필요합니다.' }, 400);
    }
    const db = getServiceSupabase();
    const { data: draft } = await db.from('blog_drafts').select('id').eq('id', draftId).maybeSingle();
    if (!draft) return adminJson({ error: '먼저 원고를 저장해 주세요.' }, 404);
    const input = new Uint8Array(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 45_000_000, animated: false });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format ?? '')) return adminJson({ error: 'JPG, PNG, WebP, GIF만 올릴 수 있습니다.' }, 400);
    const bytes = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
    const id = randomUUID();
    const objectPath = `${draftId}/${id}.webp`;
    const { error: uploadError } = await db.storage.from(BLOG_DRAFT_MEDIA_BUCKET).upload(objectPath, bytes, { contentType: 'image/webp', upsert: false });
    if (uploadError) return adminJson({ error: '이미지 업로드에 실패했습니다.' }, 503);
    const { error } = await db.from('blog_draft_media').insert({ id, draft_id: draftId, object_path: objectPath, mime_type: 'image/webp', byte_size: bytes.length, created_by: auth.userId });
    if (error) {
      await db.storage.from(BLOG_DRAFT_MEDIA_BUCKET).remove([objectPath]);
      return adminJson({ error: '이미지 정보를 저장하지 못했습니다.' }, 503);
    }
    return adminJson({ media: { id, src: `/api/admin/blog-drafts/media/${id}` } }, 201);
  } catch {
    return adminJson({ error: '이미지 형식이나 크기를 확인해 주세요.' }, 400);
  }
}
