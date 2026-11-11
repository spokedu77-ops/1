import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from './adminAuth';
import { isFieldRecordSameOrigin } from '@/app/lib/field-records/request-origin';
import { excerptFromText, plainTextFromDoc, type BlogDraftWrite } from '@/app/lib/blog-drafts/contract';

export const BLOG_DRAFT_MEDIA_BUCKET = 'blog-draft-media';
export const noStoreHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
export function adminJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: noStoreHeaders });
}
export function rejectForeignOrigin(request: Request) {
  return isFieldRecordSameOrigin(request) ? null : adminJson({ error: '다른 사이트에서 보낸 변경 요청은 허용하지 않습니다.' }, 403);
}

export function draftRow(input: BlogDraftWrite, userId: string) {
  const plain = `${plainTextFromDoc(input.content)} ${input.tags.join(' ')}`.trim();
  return {
    title: input.title,
    content: input.content,
    category: input.category,
    tags: input.tags,
    status: input.status,
    excerpt: excerptFromText(plainTextFromDoc(input.content)),
    featured_image: input.featuredImage,
    published_url: input.status === 'published' ? input.publishedUrl : null,
    published_at: input.status === 'published' ? input.publishedAt : null,
    plain_text: plain.slice(0, 20000),
    updated_at: new Date().toISOString(),
    author_id: userId,
  };
}

export async function assertOwnedMedia(draftId: string, mediaIds: string[]) {
  const ids = [...new Set(mediaIds)];
  if (!ids.length) return;
  const { data, error } = await getServiceSupabase().from('blog_draft_media').select('id').eq('draft_id', draftId).in('id', ids);
  if (error || data.length !== ids.length) throw new Error('MEDIA_NOT_OWNED');
}

export function mediaIdsInDoc(node: unknown, found: string[] = []): string[] {
  if (!node || typeof node !== 'object') return found;
  const current = node as { type?: string; attrs?: { src?: string }; content?: unknown[] };
  const src = current.attrs?.src;
  const matched = typeof src === 'string' ? src.match(/\/api\/admin\/blog-drafts\/media\/([0-9a-f-]{36})/i) : null;
  if (matched) found.push(matched[1]);
  current.content?.forEach(child => mediaIdsInDoc(child, found));
  return found;
}

export function blogDraftError(error: unknown) {
  if (error instanceof z.ZodError) return adminJson({ error: '입력값을 확인해 주세요.' }, 400);
  const message = error instanceof Error ? error.message : '원고를 처리하지 못했습니다.';
  const status = /REVISION_CONFLICT|MEDIA_NOT_OWNED|PUBLISHED/.test(message) ? 409 : 400;
  const text = message === 'REVISION_CONFLICT' ? '다른 저장이 먼저 반영되었습니다. 최신 원고를 다시 불러옵니다.' : message;
  return adminJson({ error: text }, status);
}
