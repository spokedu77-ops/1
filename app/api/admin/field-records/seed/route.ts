import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { ADMIN_RECORD_COLUMNS, adminJson, adminRecordError, recordRequestBody, rejectForeignOrigin } from '@/app/lib/server/fieldRecordsAdmin';
import { recordContentSchema, slugSchema } from '@/app/lib/field-records/contract';
import seed from '@/app/lib/field-records/approved-seed.json';

// Approved unpublished manuscripts stay server-side, never in a publicly downloadable client chunk.
export async function POST(request: Request) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request); if (originError) return originError;
  try {
    const { slug } = z.object({ slug: slugSchema }).parse(await recordRequestBody(request));
    const draft = seed.records.find(item => item.slug === slug);
    if (!draft) return adminJson({ error: '승인 원고가 없습니다.' }, 404);
    const content = recordContentSchema.parse(draft.content);
    const { data, error } = await getServiceSupabase().from('field_records').insert({ slug, draft_content: content, created_by: auth.userId, updated_by: auth.userId }).select(ADMIN_RECORD_COLUMNS).single();
    if (error) return adminJson({ error: error.code === '23505' ? '이미 등록한 원고입니다. 기존 초안을 편집해 주세요.' : '초안 등록에 실패했습니다. 승인된 마이그레이션 적용 여부를 확인해 주세요.' }, error.code === '23505' ? 409 : 503);
    return adminJson({ record: data }, 201);
  } catch (error) { return adminRecordError(error); }
}
