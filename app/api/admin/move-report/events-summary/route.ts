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

/** 바이럴 admin 채널 행 — coach 링크 유입은 INTERNAL 표식(메인 UI에서 제외). */
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

function pctLabel(num: number, den: number): { display: string; percent: number | null } {
  if (!den || den <= 0) return { display: '-', percent: null };
  if (num > den) return { display: '100%', percent: 100 };
  const p = Math.round((num / den) * 1000) / 10;
  return { display: `${p}%`, percent: p };
}

export type SourceBreakdownRow = {
  channelKey: string;
  visits: number;
  started: number;
  completed: number;
  completionRateDisplay: string;
  resultCardOpened: number;
  sharedRestart: number;
};

export type ProfileDistributionRow = {
  profileKey: string;
  profileTitle: string;
  completed: number;
  pctDisplay: string;
  resultCardOpened: number;
};

function emptyBucket() {
  return {
    viral: {
      visitUnique: 0,
      startedUnique: 0,
      completedUnique: 0,
      completionRate: { display: '-', numerator: 0, denominator: 0, percent: null as number | null },
      resultCardOpenedUnique: 0,
      shareRate: { display: '-', numerator: 0, denominator: 0, percent: null as number | null },
      sharedPageViewedUnique: 0,
      sharedStartClickedUnique: 0,
      sharedRestartRate: { display: '-', numerator: 0, denominator: 0, percent: null as number | null },
      sharedInboundCompletedUnique: 0,
      sharedReentryRate: { display: '-', numerator: 0, denominator: 0, percent: null as number | null },
    },
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
    /** 내부 실험(coach) 건수 — API 보존, 바이럴 메인 UI에서는 미사용 */
    educatorDistribution: {
      coachLinkCreated: 0,
      coachLinkLanding: 0,
      coachSubmissionCompleted: 0,
      coachDashboardViewed: 0,
      coachCsvDownloaded: 0,
    },
    sourceBreakdown: [] as SourceBreakdownRow[],
    profileDistribution: [] as ProfileDistributionRow[],
  };
}

type Bucket = ReturnType<typeof emptyBucket>;

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

function finalizeBucket(rows: EvRow[], submissionsInWindow: SubRow[]): Bucket {
  const b = emptyBucket();

  const introSet = new Set<string>();
  const started = new Set<string>();
  const completed = new Set<string>();
  const resultViewed = new Set<string>();
  const cardOpened = new Set<string>();
  const sharedStart = new Set<string>();
  const sharedPageViewed = new Set<string>();
  const sharedCompleted = new Set<string>();

  const sortedAsc = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const sessionChannel = new Map<string, string>();
  for (const row of sortedAsc) {
    if (row.event_name !== 'intro_started' && row.event_name !== 'move_report_started') continue;
    if (sessionChannel.has(row.session_id)) continue;
    sessionChannel.set(row.session_id, viralChannelKey(row.meta, row.event_name));
  }

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

    if (en === 'intro_started') introSet.add(sid);
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

  b.viral.visitUnique = introSet.size;
  b.viral.startedUnique = started.size;
  b.viral.completedUnique = completed.size;
  b.viral.resultCardOpenedUnique = cardOpened.size;
  b.viral.sharedPageViewedUnique = sharedPageViewed.size;
  b.viral.sharedStartClickedUnique = sharedStart.size;
  b.viral.sharedInboundCompletedUnique = sharedCompleted.size;

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
  b.viral.completionRate = { ...b.completion };

  const viewedDen = resultViewed.size;
  const s = pctLabel(shareIntersect, viewedDen);
  b.share = {
    display: s.display,
    percent: s.percent,
    numerator: shareIntersect,
    denominator: viewedDen,
  };
  b.viral.shareRate = { ...b.share };

  const sharedStartDen = sharedStart.size;
  const srRe = pctLabel(sharedReIntersect, sharedStartDen);
  b.sharedReentry = {
    display: srRe.display,
    percent: srRe.percent,
    numerator: sharedReIntersect,
    denominator: sharedStartDen,
  };
  b.viral.sharedReentryRate = { ...b.sharedReentry };

  const sharedViewDen = sharedPageViewed.size;
  const srRestart = pctLabel(sharedStart.size, sharedViewDen);
  b.viral.sharedRestartRate = {
    display: srRestart.display,
    percent: srRestart.percent,
    numerator: sharedStart.size,
    denominator: sharedViewDen,
  };

  /** 채널별 — coach 내부 유입 행은 메인 표에서 제외 */
  const channelKeys = new Set<string>();
  for (const sid of started) {
    const ch = sessionChannel.get(sid) ?? 'direct_unknown';
    if (ch === INTERNAL_COACH_CHANNEL) continue;
    channelKeys.add(ch);
  }
  for (const sid of introSet) {
    const ch = sessionChannel.get(sid) ?? 'direct_unknown';
    if (ch === INTERNAL_COACH_CHANNEL) continue;
    channelKeys.add(ch);
  }
  for (const sid of completed) {
    const ch = sessionChannel.get(sid) ?? 'direct_unknown';
    if (ch === INTERNAL_COACH_CHANNEL) continue;
    channelKeys.add(ch);
  }

  const breakdown: SourceBreakdownRow[] = [];
  for (const ch of sortChannelKeys([...channelKeys])) {
    let visits = 0;
    let startedN = 0;
    let completedN = 0;
    let cardN = 0;
    let sharedRestartN = 0;

    for (const sid of introSet) {
      if ((sessionChannel.get(sid) ?? 'direct_unknown') !== ch) continue;
      visits += 1;
    }
    for (const sid of started) {
      if ((sessionChannel.get(sid) ?? 'direct_unknown') !== ch) continue;
      startedN += 1;
    }
    for (const sid of completed) {
      if ((sessionChannel.get(sid) ?? 'direct_unknown') !== ch) continue;
      if (started.has(sid)) completedN += 1;
    }
    for (const sid of cardOpened) {
      if ((sessionChannel.get(sid) ?? 'direct_unknown') !== ch) continue;
      cardN += 1;
    }
    for (const sid of sharedStart) {
      if ((sessionChannel.get(sid) ?? 'direct_unknown') !== ch) continue;
      sharedRestartN += 1;
    }

    breakdown.push({
      channelKey: ch,
      visits,
      started: startedN,
      completed: completedN,
      completionRateDisplay: pctLabel(completedN, startedN).display,
      resultCardOpened: cardN,
      sharedRestart: sharedRestartN,
    });
  }
  b.sourceBreakdown = breakdown;

  /** 유형 분포 — 제출 테이블 기준 */
  const totalSubs = submissionsInWindow.length;
  const profMap = new Map<string, { title: string; n: number; card: number }>();
  for (const sub of submissionsInWindow) {
    const pk = sub.profile_key?.trim() || 'unknown';
    const title = sub.profile_title?.trim() || pk;
    const cur = profMap.get(pk) ?? { title, n: 0, card: 0 };
    cur.n += 1;
    const sid = sub.session_id;
    if (sid && cardOpened.has(sid)) cur.card += 1;
    profMap.set(pk, cur);
  }
  b.profileDistribution = [...profMap.entries()]
    .map(([profileKey, v]) => ({
      profileKey,
      profileTitle: v.title,
      completed: v.n,
      pctDisplay: totalSubs > 0 ? `${Math.min(100, Math.round((v.n / totalSubs) * 1000) / 10)}%` : '-',
      resultCardOpened: v.card,
    }))
    .sort((a, b) => b.completed - a.completed);

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

    const [evRes, subRes] = await Promise.all([
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

    const summary = {
      today: finalizeBucket(byWindow.today, subsByWindow.today),
      days7: finalizeBucket(byWindow.days7, subsByWindow.days7),
      days30: finalizeBucket(byWindow.days30, subsByWindow.days30),
    };

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error('[admin/move-report/events-summary] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
