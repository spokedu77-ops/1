import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const ALLOWED_EVENTS = new Set([
  'intro_started',
  'survey_completed',
  'result_viewed',
  'lead_saved',
  'share_clicked',
  'shared_entry_opened',
  'shared_entry_completed',
]);

const DEDUPE_WINDOW_SEC: Record<EventName, number> = {
  intro_started: 60 * 10,
  survey_completed: 60 * 10,
  result_viewed: 60 * 10,
  lead_saved: 15,
  share_clicked: 3,
  shared_entry_opened: 60 * 10,
  shared_entry_completed: 60 * 10,
};

type EventName =
  | 'intro_started'
  | 'survey_completed'
  | 'result_viewed'
  | 'lead_saved'
  | 'share_clicked'
  | 'shared_entry_opened'
  | 'shared_entry_completed';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          eventName?: unknown;
          sessionId?: unknown;
          shareKey?: unknown;
          meta?: unknown;
        }
      | null;

    const eventName = typeof body?.eventName === 'string' ? (body.eventName.trim() as EventName) : '';
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    const shareKey = typeof body?.shareKey === 'string' ? body.shareKey.trim() : null;
    const meta = body?.meta && typeof body.meta === 'object' && !Array.isArray(body.meta) ? body.meta : {};

    if (!ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 이벤트입니다.' }, { status: 400 });
    }
    const safeEventName = eventName as EventName;
    if (!sessionId || sessionId.length < 8) {
      return NextResponse.json({ ok: false, error: '세션 정보가 유효하지 않습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const dedupeSec = DEDUPE_WINDOW_SEC[safeEventName] ?? 0;
    if (dedupeSec > 0) {
      const sinceIso = new Date(Date.now() - dedupeSec * 1000).toISOString();
      let query = supabase
        .from('move_report_events')
        .select('id, created_at')
        .eq('event_name', safeEventName)
        .eq('session_id', sessionId)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(1);
      if (shareKey) {
        query = query.eq('share_key', shareKey);
      } else {
        query = query.is('share_key', null);
      }
      const { data: recent, error: recentError } = await query;
      if (recentError) {
        console.error('[move-report/events] dedupe-check', recentError);
      } else if ((recent ?? []).length > 0) {
        return NextResponse.json({ ok: true, deduped: true });
      }
    }

    const { error } = await supabase.from('move_report_events').insert({
      event_name: safeEventName,
      session_id: sessionId,
      share_key: shareKey || null,
      meta,
    });

    if (error) {
      console.error('[move-report/events]', error);
      return NextResponse.json({ ok: false, error: '이벤트 저장 중 오류가 발생했어요.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[move-report/events] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

