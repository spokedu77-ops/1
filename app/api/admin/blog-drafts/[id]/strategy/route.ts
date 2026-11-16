import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { adminJson } from '@/app/lib/server/blogDraftsAdmin';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return adminJson({ error: '원고 ID 형식이 올바르지 않습니다.' }, 400);
  }
  const db = getServiceSupabase();
  const [{ data: draft, error: draftError }, { data: strategy, error: strategyError }] = await Promise.all([
    db.from('blog_drafts').select('id,revision,title').eq('id', id).maybeSingle(),
    db.from('blog_draft_strategies').select('draft_id,source_revision,source_hash,analysis,updated_at').eq('draft_id', id).maybeSingle(),
  ]);
  if (draftError || strategyError) return adminJson({ error: '집필 전략을 불러오지 못했습니다.' }, 503);
  if (!draft) return adminJson({ error: '원고를 찾을 수 없습니다.' }, 404);
  const analysis = strategy?.analysis ?? null;
  const strategyRevisionMatch = Boolean(strategy) && Number(strategy?.source_revision) === Number(draft.revision);
  return adminJson({
    strategy: analysis,
    sourceRevision: strategy?.source_revision ?? null,
    currentRevision: draft.revision,
    needsReview: !strategyRevisionMatch,
    strategyRevisionMatch,
    searchDemandRecorded: Boolean(analysis && typeof analysis === 'object' && analysis.search_demand_audit_20261116),
    updatedAt: strategy?.updated_at ?? null,
  });
}
