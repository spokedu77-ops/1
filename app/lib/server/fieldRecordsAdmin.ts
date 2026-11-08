import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from './adminAuth';
import { recordContentSchema, slugSchema, validatePublication, type RecordContent, type RecordRow } from '@/app/lib/field-records/contract';
import { isFieldRecordSameOrigin } from '@/app/lib/field-records/request-origin';

export const FIELD_RECORD_MEDIA_BUCKET = 'field-record-media';
export const ADMIN_RECORD_COLUMNS = 'id,slug,status,draft_content,published_content,featured_slot,published_at,revision,updated_at';
export const noStoreHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
export function adminJson(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: noStoreHeaders }); }
export function rejectForeignOrigin(request: Request) {
  return isFieldRecordSameOrigin(request) ? null : adminJson({ error: '다른 사이트에서 보낸 변경 요청은 허용하지 않습니다.' }, 403);
}
export async function recordRequestBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 1_500_000) throw new Error('CONTENT_TOO_LARGE');
  const parsed: unknown = JSON.parse(raw);
  const checkDepth = (value: unknown, depth = 0): void => {
    if (depth > 20) throw new Error('CONTENT_TOO_DEEP');
    if (Array.isArray(value)) value.forEach(item => checkDepth(item, depth + 1));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => checkDepth(item, depth + 1));
  };
  checkDepth(parsed);
  return parsed;
}
export const mutationSchema = z.object({ revision: z.number().int().positive(), action: z.enum(['save', 'review', 'publish', 'unpublish', 'feature']), slug: slugSchema.optional(), content: recordContentSchema.optional(), featuredSlot: z.number().int().min(1).max(3).nullable().optional(), publishedAt: z.string().datetime({ offset: true }).nullable().optional() });
export async function validateRecordMedia(recordId: string, content: RecordContent) {
  const ids = [...new Set([content.hero, ...content.gallery].flatMap(media => media?.id ? [media.id] : []))];
  if (!ids.length) return;
  const { data, error } = await getServiceSupabase().from('field_record_media').select('id').eq('record_id', recordId).in('id', ids);
  if (error || data.length !== ids.length) throw new Error('MEDIA_NOT_OWNED');
}
export function assertPublishable(row: RecordRow) {
  const content = recordContentSchema.parse(row.draft_content);
  const issues = validatePublication(content);
  if (issues.length) throw new Error(issues.join('\n'));
  return content;
}
export function adminRecordError(error: unknown) {
  if (error instanceof z.ZodError) return adminJson({ error: '입력값을 확인해 주세요.', issues: error.issues.map(item => `${item.path.join('.')}: ${item.message}`) }, 400);
  const message = error instanceof Error ? error.message : '현장 기록 처리에 실패했습니다.';
  return adminJson({ error: message }, /REVISION_CONFLICT|MEDIA_IN_USE|PUBLISHED_SLUG|duplicate|unique/i.test(message) ? 409 : 400);
}
