import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { jsonMetadataSpan, validateSessionAssistants } from '@/app/admin/classes-shared/lib/sessionMetadata';

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data: endedSessions, error: readError } = await supabase
      .from('sessions')
      .select('id, title, updated_at, created_by, memo, price, start_at, end_at, status')
      .lt('end_at', now)
      // Legacy NULL statuses were excluded by the previous NOT IN filter; do not auto-enrol them.
      .eq('status', 'opened')
      .order('end_at').order('id')
      .limit(100);

    if (readError || !endedSessions) {
      console.error('auto-finish read failed', { code: readError?.code });
      return NextResponse.json({ ok: false, count: 0, error: '수업 자동 완료 대상을 조회하지 못했습니다.' }, { status: 500 });
    }

    const updatedIds: string[] = [];
    const failures: { id: string; title: string; code: string; reason?: string }[] = [];
    let infrastructureFailure = false;
    const skippedIds: string[] = [];
    // Each update owns its transaction. One malformed assignment cannot roll back other sessions.
    for (const session of endedSessions) {
      // Invalid drafts are actionable data issues, not recurring server exceptions.
      try {
        const span = jsonMetadataSpan(session.memo || '', 'EXTRA_TEACHERS:');
        const assistants = span ? JSON.parse((session.memo || '').slice(span.start, span.end)) : [];
        const invalidShape = !Array.isArray(assistants) || assistants.some(row => !row || typeof row.id !== 'string' || typeof row.price !== 'number');
        const reason = invalidShape ? '보조강사 배정 형식을 확인해 주세요.' : validateSessionAssistants(assistants, session.created_by);
        if (reason) {
          failures.push({ id: session.id, title: session.title || '', code: 'SESSION_ASSISTANTS_INVALID', reason });
          continue;
        }
      } catch {
        failures.push({ id: session.id, title: session.title || '', code: 'SESSION_METADATA_INVALID', reason: '보조강사 메모가 잘못되어 완료 처리할 수 없습니다.' });
        continue;
      }
      try {
        const update = supabase
          .from('sessions')
          .update({ status: 'finished' })
          .eq('id', session.id)
          .lt('end_at', now)
          .eq('status', 'opened');
        let guarded = update;
        for (const key of ['updated_at', 'created_by', 'memo', 'price', 'start_at', 'end_at', 'status'] as const) {
          const value = session[key];
          guarded = value == null ? guarded.is(key, null) : guarded.eq(key, value);
        }
        const { data, error } = await guarded.select('id').maybeSingle();
        if (error) {
          failures.push({ id: session.id, title: session.title || '', code: error.code || 'UPDATE_FAILED' });
          if (/^(22|23)/.test(error.code || '')) {
            console.warn('auto-finish requires data review', { sessionId: session.id, code: error.code });
          } else {
            infrastructureFailure = true;
            console.error('auto-finish update failed', { sessionId: session.id, code: error.code });
          }
        } else if (data) {
          updatedIds.push(data.id);
        } else {
          skippedIds.push(session.id);
        }
      } catch (error) {
        infrastructureFailure = true;
        failures.push({ id: session.id, title: session.title || '', code: 'UPDATE_FAILED' });
        console.error('auto-finish request failed', { sessionId: session.id, error: error instanceof Error ? error.name : 'unknown' });
      }
    }

    return NextResponse.json({
      ok: failures.length === 0, count: updatedIds.length, updatedIds, failures, skippedIds,
      status: failures.length ? infrastructureFailure ? 'failed' : 'needs-review' : 'complete',
      batchLimit: 100, hasMore: endedSessions.length === 100,
    }, { status: infrastructureFailure ? 500 : failures.length ? 207 : 200 });
  } catch (error) {
    console.error('auto-finish failed', { error: error instanceof Error ? error.name : 'unknown' });
    return NextResponse.json({ ok: false, count: 0, error: '수업 자동 완료에 실패했습니다.' }, { status: 500 });
  }
}
