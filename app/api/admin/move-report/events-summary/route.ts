import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { classifyMoveReportEventSource } from '@/app/move-report/lib/moveReportSourceClassify';

/** 슬림 대시보드용 조회 이벤트만 */
const QUERY_EVENT_NAMES = [
  'move_report_started',
  'move_report_completed',
  'result_viewed',
  'shared_entry_completed',
  'move_report_shared_page_viewed',
  'move_report_shared_page_start_clicked',
  'move_report_private_consult_clicked',
  'move_report_private_apply_submitted',
  'move_report_educator_beta_form_opened',
  'move_report_educator_beta_submitted',
] as const;

type WindowKey = 'today' | 'days7' | 'days30';

type EvRow = {
  event_name: string;
  created_at: string;
  session_id: string;
  meta: unknown;
};

type SubRow = {
  session_id: string | null;
  profile_key: string | null;
  profile_title: string | null;
  created_at: string;
};

const INTERNAL_COACH_CHANNEL = '__internal_coach';

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

function viralChannelKey(meta: unknown, eventName?: string): string {
  const attr = parseAttribution(meta);
  const { bucket, label } = classifyMoveReportEventSource(meta, eventName);
  if (bucket === 'coach_link' || label === 'coach_link') return INTERNAL_COACH_CHANNEL;

  const mr = attr.mr_source?.trim();
  if (mr === 'parent_direct') return 'parent_direct';
  if (mr === 'educator_campaign') return 'educator_campaign';
  if (mr === 'shared') return 'shared';
  if (mr === 'direct_unknown') return 'direct_unknown';

  if (bucket === 'utm' && attr.utm_source?.trim()) return `utm:${attr.utm_source.trim()}`;
  if (bucket === 'ref' && attr.referrer_host?.trim()) return `ref:${attr.referrer_host.trim()}`;
  if (bucket === 'utm') return `utm:${label}`;
  if (bucket === 'ref') return `ref:${label}`;

  return 'direct_unknown';
}

function pctLabel(num: number, den: number): { display: string; percent: number | null; numerator: number; denominator: number } {
  if (!den || den <= 0) return { display: '-', percent: null, numerator: num, denominator: den };
  if (num > den) return { display: '100%', percent: 100, numerator: num, denominator: den };
  const p = Math.round((num / den) * 1000) / 10;
  return { display: `${p}%`, percent: p, numerator: num, denominator: den };
}

export type SourceBreakdownRow = {
  channelKey: string;
  started: number;
  completed: number;
  completionRateDisplay: string;
  consultClicked: number;
};

export type ProfileDistributionRow = {
  profileKey: string;
  profileTitle: string;
  completed: number;
  pctDisplay: string;
};

export type DailySeriesRow = {
  date: string;
  started: number;
  completed: number;
  consultClicked: number;
};

function sortChannelKeys(keys: string[]): string[] {
  const priority = ['parent_direct', 'educator_campaign', 'shared', 'direct_unknown'];
  return [...keys].sort((a, b) => {
    const ia = priority.indexOf(a);
    const ib = priority.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'ko');
  });
}

function ymdLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function finalizeBucket(rows: EvRow[], submissionsInWindow: SubRow[], educatorLeadsCount: number) {
  const started = new Set<string>();
  const completed = new Set<string>();
  const resultViewed = new Set<string>();
  const consultClicked = new Set<string>();
  const applySubmitted = new Set<string>();
  const sharedPageViewed = new Set<string>();
  const sharedStart = new Set<string>();
  const sharedCompleted = new Set<string>();
  let educatorBetaOpened = 0;
  let educatorBetaSubmitted = 0;

  const sortedAsc = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const sessionChannel = new Map<string, string>();
  for (const row of sortedAsc) {
    if (row.event_name !== 'move_report_started') continue;
    if (sessionChannel.has(row.session_id)) continue;
    sessionChannel.set(row.session_id, viralChannelKey(row.meta, row.event_name));
  }

  for (const row of rows) {
    const sid = row.session_id;
    if (!sid) continue;
    const en = row.event_name;
    const attr = parseAttribution(row.meta);

    if (en === 'move_report_started') started.add(sid);
    if (en === 'move_report_completed') {
      completed.add(sid);
      const classifiedShared = classifyMoveReportEventSource(row.meta, en).bucket === 'shared';
      if (attr.mr_source === 'shared' || classifiedShared) sharedCompleted.add(sid);
    }
    if (en === 'result_viewed') resultViewed.add(sid);
    if (en === 'move_report_private_consult_clicked') consultClicked.add(sid);
    if (en === 'move_report_private_apply_submitted') applySubmitted.add(sid);
    if (en === 'move_report_shared_page_viewed') sharedPageViewed.add(sid);
    if (en === 'move_report_shared_page_start_clicked') sharedStart.add(sid);
    if (en === 'shared_entry_completed') sharedCompleted.add(sid);
    if (en === 'move_report_educator_beta_form_opened') educatorBetaOpened += 1;
    if (en === 'move_report_educator_beta_submitted') educatorBetaSubmitted += 1;
  }

  let completionIntersect = 0;
  let orphanCompleted = 0;
  for (const sid of completed) {
    if (started.has(sid)) completionIntersect += 1;
    else orphanCompleted += 1;
  }

  let consultIntersect = 0;
  for (const sid of consultClicked) {
    if (resultViewed.has(sid)) consultIntersect += 1;
  }

  let applyIntersect = 0;
  for (const sid of applySubmitted) {
    if (consultClicked.has(sid)) applyIntersect += 1;
  }

  const channelKeys = new Set<string>();
  for (const sid of started) {
    const ch = sessionChannel.get(sid) ?? 'direct_unknown';
    if (ch === INTERNAL_COACH_CHANNEL) continue;
    channelKeys.add(ch);
  }
  for (const sid of completed) {
    const ch = sessionChannel.get(sid) ?? 'direct_unknown';
    if (ch === INTERNAL_COACH_CHANNEL) continue;
    channelKeys.add(ch);
  }

  const sourceBreakdown: SourceBreakdownRow[] = [];
  for (const ch of sortChannelKeys([...channelKeys])) {
    let startedN = 0;
    let completedN = 0;
    let consultN = 0;
    for (const sid of started) {
      if ((sessionChannel.get(sid) ?? 'direct_unknown') !== ch) continue;
      startedN += 1;
    }
    for (const sid of completed) {
      if ((sessionChannel.get(sid) ?? 'direct_unknown') !== ch) continue;
      if (started.has(sid)) completedN += 1;
    }
    for (const sid of consultClicked) {
      if ((sessionChannel.get(sid) ?? 'direct_unknown') !== ch) continue;
      consultN += 1;
    }
    sourceBreakdown.push({
      channelKey: ch,
      started: startedN,
      completed: completedN,
      completionRateDisplay: pctLabel(completedN, startedN).display,
      consultClicked: consultN,
    });
  }

  const totalSubs = submissionsInWindow.length;
  const profMap = new Map<string, { title: string; n: number }>();
  for (const sub of submissionsInWindow) {
    const pk = sub.profile_key?.trim() || 'unknown';
    const title = sub.profile_title?.trim() || pk;
    const cur = profMap.get(pk) ?? { title, n: 0 };
    cur.n += 1;
    profMap.set(pk, cur);
  }
  const profileDistribution: ProfileDistributionRow[] = [...profMap.entries()]
    .map(([profileKey, v]) => ({
      profileKey,
      profileTitle: v.title,
      completed: v.n,
      pctDisplay: totalSubs > 0 ? `${Math.min(100, Math.round((v.n / totalSubs) * 1000) / 10)}%` : '-',
    }))
    .sort((a, b) => b.completed - a.completed);

  const dayMap = new Map<string, { started: Set<string>; completed: Set<string>; consult: Set<string> }>();
  for (const row of rows) {
    const day = ymdLocal(row.created_at);
    if (!day || !row.session_id) continue;
    const bucket = dayMap.get(day) ?? {
      started: new Set<string>(),
      completed: new Set<string>(),
      consult: new Set<string>(),
    };
    if (row.event_name === 'move_report_started') bucket.started.add(row.session_id);
    if (row.event_name === 'move_report_completed') bucket.completed.add(row.session_id);
    if (row.event_name === 'move_report_private_consult_clicked') bucket.consult.add(row.session_id);
    dayMap.set(day, bucket);
  }
  const dailySeries: DailySeriesRow[] = [...dayMap.entries()]
    .map(([date, v]) => ({
      date,
      started: v.started.size,
      completed: v.completed.size,
      consultClicked: v.consult.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    funnel: {
      startedUnique: started.size,
      completedUnique: completed.size,
      completionRate: pctLabel(completionIntersect, started.size),
      resultViewedUnique: resultViewed.size,
    },
    conversion: {
      consultClickedUnique: consultClicked.size,
      applySubmittedUnique: applySubmitted.size,
      consultRate: pctLabel(consultIntersect, resultViewed.size),
      applyRate: pctLabel(applyIntersect, consultClicked.size),
      educatorBetaOpened,
      educatorBetaSubmitted,
      educatorLeadsCount,
    },
    shared: {
      pageViewedUnique: sharedPageViewed.size,
      startClickedUnique: sharedStart.size,
      restartRate: pctLabel(sharedStart.size, sharedPageViewed.size),
      inboundCompletedUnique: sharedCompleted.size,
    },
    sourceBreakdown,
    profileDistribution,
    dailySeries,
    dataQuality: {
      orphanCompletedSessions: orphanCompleted,
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

    const [evRes, subRes, eduToday, edu7, edu30] = await Promise.all([
      supabase
        .from('move_report_events')
        .select('event_name, created_at, session_id, meta')
        .in('event_name', [...QUERY_EVENT_NAMES])
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(80000),
      supabase
        .from('move_report_submissions')
        .select('session_id, profile_key, profile_title, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50000),
      supabase
        .from('move_report_educator_leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('move_report_educator_leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('move_report_educator_leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
    ]);

    if (evRes.error) {
      console.error('[admin/move-report/events-summary]', evRes.error);
      return NextResponse.json({ ok: false, error: '이벤트 요약 조회 중 오류가 발생했어요.' }, { status: 500 });
    }
    if (subRes.error) {
      console.error('[admin/move-report/events-summary] submissions', subRes.error);
      return NextResponse.json({ ok: false, error: '제출 요약 조회 중 오류가 발생했어요.' }, { status: 500 });
    }

    const rows = (evRes.data ?? []) as EvRow[];
    const submissions = (subRes.data ?? []) as SubRow[];

    const byWindow: Record<WindowKey, EvRow[]> = { today: [], days7: [], days30: [] };
    const subsByWindow: Record<WindowKey, SubRow[]> = { today: [], days7: [], days30: [] };

    for (const row of rows) {
      const createdAtMs = new Date(row.created_at).getTime();
      if (Number.isNaN(createdAtMs)) continue;
      if (createdAtMs >= thirtyDaysAgo.getTime()) byWindow.days30.push(row);
      if (createdAtMs >= sevenDaysAgo.getTime()) byWindow.days7.push(row);
      if (createdAtMs >= todayStart.getTime()) byWindow.today.push(row);
    }

    for (const row of submissions) {
      const createdAtMs = new Date(row.created_at).getTime();
      if (Number.isNaN(createdAtMs)) continue;
      if (createdAtMs >= thirtyDaysAgo.getTime()) subsByWindow.days30.push(row);
      if (createdAtMs >= sevenDaysAgo.getTime()) subsByWindow.days7.push(row);
      if (createdAtMs >= todayStart.getTime()) subsByWindow.today.push(row);
    }

    const eduCounts: Record<WindowKey, number> = {
      today: eduToday.count ?? 0,
      days7: edu7.count ?? 0,
      days30: edu30.count ?? 0,
    };

    const summary = {
      today: finalizeBucket(byWindow.today, subsByWindow.today, eduCounts.today),
      days7: finalizeBucket(byWindow.days7, subsByWindow.days7, eduCounts.days7),
      days30: finalizeBucket(byWindow.days30, subsByWindow.days30, eduCounts.days30),
    };

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error('[admin/move-report/events-summary] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
