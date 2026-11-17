import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import { appendWorkLog, listWorkEvents } from '@/app/lib/server/aiWorkLog';
import { buildProjectContext, isWorkStatus } from '@/app/lib/admin/updateLog/contract';
import { rejectForeignOrigin, adminJson } from '@/app/lib/server/blogDraftsAdmin';

const INTEGRATION = {
  chatgptAutoIngest: false,
  chatgptAutoRead: false,
  codexAutoRecord: false,
  supported: [
    '관리자 세션으로 POST /api/admin/update-log',
    '관리자 세션으로 GET /api/admin/update-log',
    '관리자 세션으로 GET /api/admin/update-log/context',
    '로컬 CLI: node --import tsx scripts/ai-work-log.ts context|record',
  ],
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const project = url.searchParams.get('project')?.trim() || undefined;
  const statusParam = url.searchParams.get('status')?.trim() || '';
  const status = statusParam && isWorkStatus(statusParam) ? statusParam : undefined;
  if (statusParam && !status) return adminJson({ error: '상태 필터가 올바르지 않습니다.' }, 400);
  const workKey = url.searchParams.get('workKey')?.trim() || undefined;
  if ((project?.length ?? 0) > 80 || (workKey?.length ?? 0) > 160) return adminJson({ error: '필터 길이를 확인해 주세요.' }, 400);
  const timeline = url.searchParams.get('view') === 'timeline';
  const listed = await listWorkEvents({ project, workKey, ...(timeline ? { maxEvents: 5000 } : {}) });
  if (!listed.ok) return adminJson({ error: listed.error }, 503);
  const contextProject = project ?? '';
  return adminJson({
    events: status ? listed.events.filter(event => event.status === status) : listed.events,
    context: project ? buildProjectContext(listed.events.filter(event => event.project === contextProject)) : null,
    integration: INTEGRATION,
    ...(timeline ? { coverage: { complete: listed.complete, eventLimit: 5000 } } : {}),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request);
  if (originError) return originError;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return adminJson({ error: '요청 본문을 읽을 수 없습니다.' }, 400);
  }
  if (!body || typeof body !== 'object') return adminJson({ error: '요청 본문을 확인해 주세요.' }, 400);
  const input = body as Record<string, unknown>;
  try {
    const result = await appendWorkLog(auth.userId, {
      workKey: typeof input.workKey === 'string' ? input.workKey : undefined,
      project: String(input.project ?? ''),
      status: String(input.status ?? ''),
      summary: String(input.summary ?? ''),
      details: typeof input.details === 'string' ? input.details : '',
      sourceType: typeof input.sourceType === 'string' ? input.sourceType : 'manual',
      sourceUrl: typeof input.sourceUrl === 'string' ? input.sourceUrl : '',
      verificationNote: typeof input.verificationNote === 'string' ? input.verificationNote : '',
    });
    if (!result.ok) return adminJson({ error: result.error }, result.status);
    return NextResponse.json({ ok: true, duplicate: result.duplicate, event: result.event, integration: INTEGRATION }, {
      status: result.duplicate ? 200 : 201,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '기록을 저장하지 못했습니다.';
    return adminJson({ error: message }, 400);
  }
}
