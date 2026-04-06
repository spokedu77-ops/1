import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const EVENT_NAMES = [
  'intro_started',
  'survey_completed',
  'result_viewed',
  'lead_saved',
  'share_clicked',
  'shared_entry_opened',
  'shared_entry_completed',
] as const;

type EventName = (typeof EVENT_NAMES)[number];
type WindowKey = 'today' | 'days7' | 'days30';

type SummaryRow = {
  event_name: EventName;
  created_at: string;
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function calcRate(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function emptyCounter(): Record<EventName, number> {
  return {
    intro_started: 0,
    survey_completed: 0,
    result_viewed: 0,
    lead_saved: 0,
    share_clicked: 0,
    shared_entry_opened: 0,
    shared_entry_completed: 0,
  };
}

function makeWindow(counter: Record<EventName, number>) {
  return {
    counts: counter,
    kpi: {
      completionRate: calcRate(counter.survey_completed, counter.intro_started),
      shareRate: calcRate(counter.share_clicked, counter.result_viewed),
      sharedRecompletionRate: calcRate(counter.shared_entry_completed, counter.shared_entry_opened),
    },
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const todayStart = startOfToday();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('move_report_events')
      .select('event_name, created_at')
      .in('event_name', [...EVENT_NAMES])
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50000);

    if (error) {
      console.error('[admin/move-report/events-summary]', error);
      return NextResponse.json({ ok: false, error: '이벤트 요약 조회 중 오류가 발생했어요.' }, { status: 500 });
    }

    const counters: Record<WindowKey, Record<EventName, number>> = {
      today: emptyCounter(),
      days7: emptyCounter(),
      days30: emptyCounter(),
    };

    for (const row of (data ?? []) as SummaryRow[]) {
      if (!EVENT_NAMES.includes(row.event_name)) continue;
      const createdAtMs = new Date(row.created_at).getTime();
      if (Number.isNaN(createdAtMs)) continue;
      if (createdAtMs >= thirtyDaysAgo.getTime()) counters.days30[row.event_name] += 1;
      if (createdAtMs >= sevenDaysAgo.getTime()) counters.days7[row.event_name] += 1;
      if (createdAtMs >= todayStart.getTime()) counters.today[row.event_name] += 1;
    }

    return NextResponse.json({
      ok: true,
      summary: {
        today: makeWindow(counters.today),
        days7: makeWindow(counters.days7),
        days30: makeWindow(counters.days30),
      },
    });
  } catch (e) {
    console.error('[admin/move-report/events-summary] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

