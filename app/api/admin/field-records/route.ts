import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { ADMIN_RECORD_COLUMNS, adminJson, adminRecordError, recordRequestBody, rejectForeignOrigin } from '@/app/lib/server/fieldRecordsAdmin';
import { recordContentSchema, slugSchema, MIGRATED_RECORD_SLUGS } from '@/app/lib/field-records/contract';
import { FIELD_RECORD_CATALOG } from '@/app/spokedu/data/field-records-catalog';
import { fieldRecordsCmsEnabled } from '@/app/lib/server/fieldRecords';

export async function GET() {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const { data, error } = await getServiceSupabase().from('field_records').select(ADMIN_RECORD_COLUMNS).order('updated_at', { ascending: false }).limit(1000);
  if (error) return adminJson({ error: '현장 기록 관리 테이블을 확인해 주세요. 승인된 마이그레이션이 적용되어야 합니다.' }, 503);
  if (data.length === 1000) return adminJson({ error: '조회 범위에 도달했습니다. 목록을 안전하게 표시할 수 없습니다.' }, 409);
  return adminJson({ records: data, publicEnabled: fieldRecordsCmsEnabled() });
}
export async function POST(request: Request) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request); if (originError) return originError;
  try {
    const input = z.object({ slug: slugSchema, content: recordContentSchema }).parse(await recordRequestBody(request));
    if (FIELD_RECORD_CATALOG.some(item => item.slug === input.slug) && !MIGRATED_RECORD_SLUGS.some(slug => slug === input.slug)) return adminJson({ error: '기존 사례가 사용 중인 슬러그입니다.' }, 409);
    if ([input.content.hero, ...input.content.gallery].some(media => media?.id)) return adminJson({ error: '새 기록을 저장한 후 사진을 업로드해 주세요.' }, 400);
    const { data, error } = await getServiceSupabase().from('field_records').insert({ slug: input.slug, draft_content: input.content, created_by: auth.userId, updated_by: auth.userId }).select(ADMIN_RECORD_COLUMNS).single();
    if (error) return adminJson({ error: error.code === '23505' ? '이미 사용 중인 슬러그입니다.' : '초안을 저장하지 못했습니다.' }, error.code === '23505' ? 409 : 503);
    return adminJson({ record: data }, 201);
  } catch (error) { return adminRecordError(error); }
}
