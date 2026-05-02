import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { classifyMoveReportEventSource } from '@/app/move-report/lib/moveReportSourceClassify';

/** KPI·버킷용으로 조회하는 이벤트명 */
const QUERY_EVENT_NAMES = [
  'intro_started',
  'move_report_started',
  'survey_completed',
  'move_report_completed',
  'result_viewed',
  'share_clicked',
  'move_report_result_card_opened',
  'shared_entry_opened',
  'shared_entry_completed',
  'move_report_shared_page_start_clicked',
  'move_report_shared_page_viewed',
  'move_report_coach_link_created',
  'move_report_coach_link_landing',
  'move_report_coach_submission_completed',
  'move_report_coach_dashboard_viewed',
  'move_report_coach_csv_downloaded',
] as const;

type WindowKey = 'today' | 'days7' | 'days30';

type EvRow = {
  event_name: string;
  created_at: string;
  session_id: string;
  meta: unknown;
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseAttribution(meta: unknown): Record<string, string> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
  const m = meta as { attribution?: unknown };
  if (!m.attribution || typeof m.attribution !== 'object' || Array.isArray(m.attribution)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m.attribution as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return out;
}

function pctLabel(num: number, den: number): { display: string; percent: number | null } {
  if (!den || den <= 0) return { display: '-', percent: null };
  const p = Math.round((num / den) * 1000) / 10;
  return { display: `${p}%`, percent: p };
}

function emptyBucket() {
  return {
    completion: { display: '-', numerator: 0, denominator: 0, percent: null as number | null },
    share: { display: '-', numerator: 0, denominator: 0, percent: null as number | null },
    sharedReentry: { display: '-', numerator: 0, denominator: 0, percent: null as number | null },
    dataQuality: {
      orphanCompletedSessions: 0,
      orphanResultCardOpenedSessions: 0,
      orphanSharedCompletedSessions: 0,
    },
    rawEventTotals: {} as Record<string, number>,
    parentViral: {
      startedUnique: 0,
      completedUnique: 0,
      resultCardOpenedUnique: 0,
      sharedPageViewedUnique: 0,
      sharedStartClickedUnique: 0,
    },
    educatorDistribution: {
      coachLinkCreated: 0,
      coachLinkLanding: 0,
      coachSubmissionCompleted: 0,
      coachDashboardViewed: 0,
      coachCsvDownloaded: 0,
    },
  };
}

type Bucket = ReturnType<typeof emptyBucket>;

function finalizeBucket(rows: EvRow[]): Bucket {
  const b = emptyBucket();

  const started = new Set<string>();
  const completed = new Set<string>();
  const resultViewed = new Set<string>();
  const cardOpened = new Set<string>();
  const sharedStart = new Set<string>();
  const sharedPageViewed = new Set<string>();
  /** 완료 이벤트가 있고, mr_source=shared 또는 분류기가 shared인 세션 */
  const sharedCompleted = new Set<string>();

  for (const row of rows) {
    const sid = row.session_id;
    if (!sid) continue;
    const en = row.event_name;
    const attr = parseAttribution(row.meta);

    b.rawEventTotals[en] = (b.rawEventTotals[en] ?? 0) + 1;

    if (en === 'move_report_coach_link_created') b.educatorDistribution.coachLinkCreated += 1;
    if (en === 'move_report_coach_link_landing') b.educatorDistribution.coachLinkLanding += 1;
    if (en === 'move_report_coach_submission_completed') b.educatorDistribution.coachSubmissionCompleted += 1;
    if (en === 'move_report_coach_dashboard_viewed') b.educatorDistribution.coachDashboardViewed += 1;
    if (en === 'move_report_coach_csv_downloaded') b.educatorDistribution.coachCsvDownloaded += 1;

    if (en === 'intro_started' || en === 'move_report_started') started.add(sid);
    if (en === 'survey_completed' || en === 'move_report_completed') {
      completed.add(sid);
      const classifiedShared = classifyMoveReportEventSource(row.meta, en).bucket === 'shared';
      if (attr.mr_source === 'shared' || classifiedShared) sharedCompleted.add(sid);
    }
    if (en === 'result_viewed') resultViewed.add(sid);
    if (en === 'move_report_result_card_opened') cardOpened.add(sid);
    if (en === 'move_report_shared_page_start_clicked') sharedStart.add(sid);
    if (en === 'move_report_shared_page_viewed') sharedPageViewed.add(sid);
  }

  b.parentViral.startedUnique = started.size;
  b.parentViral.completedUnique = completed.size;
  b.parentViral.resultCardOpenedUnique = cardOpened.size;
  b.parentViral.sharedStartClickedUnique = sharedStart.size;
  b.parentViral.sharedPageViewedUnique = sharedPageViewed.size;

  let completionIntersect = 0;
  for (const sid of completed) {
    if (started.has(sid)) completionIntersect += 1;
  }
  let orphanCompleted = 0;
  for (const sid of completed) {
    if (!started.has(sid)) orphanCompleted += 1;
  }

  let shareIntersect = 0;
  for (const sid of cardOpened) {
    if (resultViewed.has(sid)) shareIntersect += 1;
  }
  let orphanCardOpened = 0;
  for (const sid of cardOpened) {
    if (!resultViewed.has(sid)) orphanCardOpened += 1;
  }

  let sharedReIntersect = 0;
  for (const sid of sharedCompleted) {
    if (sharedStart.has(sid)) sharedReIntersect += 1;
  }
  let orphanSharedCompleted = 0;
  for (const sid of sharedCompleted) {
    if (!sharedStart.has(sid)) orphanSharedCompleted += 1;
  }

  b.dataQuality = {
    orphanCompletedSessions: orphanCompleted,
    orphanResultCardOpenedSessions: orphanCardOpened,
    orphanSharedCompletedSessions: orphanSharedCompleted,
  };

  const startedDen = started.size;
  const c = pctLabel(completionIntersect, startedDen);
  b.completion = {
    display: c.display,
    percent: c.percent,
    numerator: completionIntersect,
    denominator: startedDen,
  };

  const viewedDen = resultViewed.size;
  const s = pctLabel(shareIntersect, viewedDen);
  b.share = {
    display: s.display,
    percent: s.percent,
    numerator: shareIntersect,
    denominator: viewedDen,
  };

  const sharedStartDen = sharedStart.size;
  const sr = pctLabel(sharedReIntersect, sharedStartDen);
  b.sharedReentry = {
    display: sr.display,
    percent: sr.percent,
    numerator: sharedReIntersect,
    denominator: sharedStartDen,
  };

  return b;
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
      .select('event_name, created_at, session_id, meta')
      .in('event_name', [...QUERY_EVENT_NAMES])
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(80000);

    if (error) {
      console.error('[admin/move-report/events-summary]', error);
      return NextResponse.json({ ok: false, error: '이벤트 요약 조회 중 오류가 발생했어요.' }, { status: 500 });
    }

    const rows = (data ?? []) as EvRow[];

    const byWindow: Record<WindowKey, EvRow[]> = { today: [], days7: [], days30: [] };
    for (const row of rows) {
      const createdAtMs = new Date(row.created_at).getTime();
      if (Number.isNaN(createdAtMs)) continue;
      if (createdAtMs >= thirtyDaysAgo.getTime()) byWindow.days30.push(row);
      if (createdAtMs >= sevenDaysAgo.getTime()) byWindow.days7.push(row);
      if (createdAtMs >= todayStart.getTime()) byWindow.today.push(row);
    }

    const summary = {
      today: finalizeBucket(byWindow.today),
      days7: finalizeBucket(byWindow.days7),
      days30: finalizeBucket(byWindow.days30),
    };

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error('[admin/move-report/events-summary] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
