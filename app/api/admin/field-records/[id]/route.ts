import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { ADMIN_RECORD_COLUMNS, adminJson, adminRecordError, assertPublishable, mutationSchema, recordRequestBody, validateRecordMedia, rejectForeignOrigin } from '@/app/lib/server/fieldRecordsAdmin';
import type { RecordRow } from '@/app/lib/field-records/contract';
import { FIELD_RECORD_CATALOG } from '@/app/spokedu/data/field-records-catalog';

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const { id } = await context.params; if (!z.string().uuid().safeParse(id).success) return adminJson({ error: '잘못된 기록 ID입니다.' }, 400);
  const { data, error } = await getServiceSupabase().from('field_records').select(ADMIN_RECORD_COLUMNS).eq('id', id).maybeSingle();
  if (error) return adminJson({ error: '기록 조회에 실패했습니다.' }, 503);
  return data ? adminJson({ record: data }) : adminJson({ error: '기록이 없습니다.' }, 404);
}
export async function PUT(request: Request, context: Context) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request); if (originError) return originError;
  try {
    const { id } = await context.params; z.string().uuid().parse(id);
    const input = mutationSchema.parse(await recordRequestBody(request));
    const db = getServiceSupabase();
    const { data: row, error: readError } = await db.from('field_records').select(ADMIN_RECORD_COLUMNS).eq('id', id).maybeSingle();
    if (readError) return adminJson({ error: '기록 조회에 실패했습니다.' }, 503);
    if (!row) return adminJson({ error: '기록이 없습니다.' }, 404);
    if (row.revision !== input.revision) return adminJson({ error: '다른 탭에서 먼저 수정했습니다. 현재 내용을 복사한 뒤 다시 불러와 주세요.', code: 'REVISION_CONFLICT' }, 409);
    if (input.action === 'save' || input.action === 'review') {
      if (!input.content || !input.slug) return adminJson({ error: '본문과 슬러그가 필요합니다.' }, 400);
      if (input.slug !== row.slug && FIELD_RECORD_CATALOG.some(item => item.slug === input.slug)) return adminJson({ error: '기존 사례가 사용 중인 슬러그입니다.' }, 409);
      await validateRecordMedia(id, input.content);
    }
    if (input.action === 'publish') {
      const content = assertPublishable(row as RecordRow);
      await validateRecordMedia(id, content);
      if (input.publishedAt && new Date(input.publishedAt).getTime() > Date.now()) return adminJson({ error: '미래 날짜 예약 게시는 지원하지 않습니다.' }, 400);
    }
    const { data, error } = await db.rpc('mutate_field_record', { p_id: id, p_revision: input.revision, p_action: input.action, p_user: auth.userId,
      p_slug: input.slug ?? row.slug, p_content: input.content ?? null, p_slot: input.featuredSlot === undefined ? row.featured_slot : input.featuredSlot, p_published_at: input.publishedAt ?? null });
    if (error) throw new Error(error.code === '23505' ? '이미 사용 중인 슬러그 또는 대표 사례 자리입니다. 해당 자리를 먼저 해제해 주세요.' : error.message);
    const saved = Array.isArray(data) ? data[0] : data;
    if (!saved?.id) return adminJson({ error: '저장 결과를 확인하지 못했습니다. 새로 불러와 상태를 확인해 주세요.' }, 503);
    if (['publish', 'unpublish', 'feature'].includes(input.action)) {
      for (const path of ['/', '/records', `/records/${row.slug}`, '/sitemap.xml']) revalidatePath(path);
    }
    return adminJson({ record: saved });
  } catch (error) { return adminRecordError(error); }
}
