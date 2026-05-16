import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import type { Program } from '@/app/spokedu-master/types';

const FALLBACK_COLORS: [string, string, string, string][] = [
  ['#312e81', '#3730a3', '#4338ca', '#4f46e5'],
  ['#064e3b', '#047857', '#16a34a', '#86efac'],
  ['#713f12', '#92400e', '#b45309', '#d97706'],
  ['#1e1b4b', '#2d2a6e', '#3730a3', '#6366f1'],
  ['#1c1917', '#292524', '#44403c', '#78716c'],
];

function pickColors(idx: number): [string, string, string, string] {
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return m?.[1] ?? null;
}

function buildThumbnailUrl(videoUrl: string | null | undefined): string | undefined {
  if (!videoUrl) return undefined;
  const id = extractYouTubeId(videoUrl);
  // mqdefault.jpg = 320x180 (true 16:9, no letterboxing)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : undefined;
}

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  const { data: curriculumRows, error: currErr } = await supabase
    .from('curriculum')
    .select('id,title,url,check_list,equipment,steps,expert_tip,display_order')
    .eq('is_sub', false)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: false });

  if (currErr || !curriculumRows) {
    return NextResponse.json({ error: currErr?.message ?? 'DB error' }, { status: 500 });
  }

  const curriculumIds = (curriculumRows as { id: number }[]).map((r) => r.id);

  type MetaRow = {
    curriculum_id: number;
    sm_tags: string[] | null;
    sm_theme: string | null;
    sm_grade: string | null;
    sm_space: string | null;
    sm_duration: number | null;
    sm_is_pro: boolean;
    sm_is_new: boolean;
    sm_is_hot: boolean;
    sm_display_order: number;
    sm_colors: string[] | null;
  };

  const metaByCurriculumId = new Map<number, MetaRow>();
  if (curriculumIds.length > 0) {
    const { data: metaRows } = await supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_duration,sm_is_pro,sm_is_new,sm_is_hot,sm_display_order,sm_colors')
      .in('curriculum_id', curriculumIds);
    for (const m of (metaRows ?? []) as MetaRow[]) {
      metaByCurriculumId.set(m.curriculum_id, m);
    }
  }

  type OverlayRow = {
    source_center_curriculum_id: number | null;
    video_url: string | null;
    activity_tip: string | null;
    activity_method: string | null;
    equipment: string | null;
    checklist: string | null;
    updated_at: string | null;
    function_type: string | null;
    function_types: string[] | null;
    main_theme: string | null;
    group_size: string | null;
  };

  const overlayByCurriculumId = new Map<number, OverlayRow>();
  if (curriculumIds.length > 0) {
    const { data: overlayRows } = await supabase
      .from('spokedu_pro_programs')
      .select('source_center_curriculum_id,video_url,activity_tip,activity_method,equipment,checklist,updated_at,function_type,function_types,main_theme,group_size')
      .in('source_center_curriculum_id', curriculumIds);
    for (const o of (overlayRows ?? []) as OverlayRow[]) {
      const cid = o.source_center_curriculum_id;
      if (cid == null) continue;
      const prev = overlayByCurriculumId.get(cid);
      if (!prev) { overlayByCurriculumId.set(cid, o); continue; }
      const prevT = prev.updated_at ? Date.parse(prev.updated_at) : 0;
      const nextT = o.updated_at ? Date.parse(o.updated_at) : 0;
      if (nextT >= prevT) overlayByCurriculumId.set(cid, o);
    }
  }

  type CurrRow = {
    id: number;
    title: string | null;
    url: string | null;
    check_list: string[] | null;
    equipment: string[] | null;
    steps: string[] | null;
    expert_tip: string | null;
    display_order: number | null;
  };

  // Check subscription to gate Pro lessonDetail server-side
  const { data: subRow } = await supabase
    .from('spokedu_master_subscriptions')
    .select('plan, status, period_end')
    .eq('user_id', user.id)
    .maybeSingle() as { data: { plan: string; status: string; period_end: string | null } | null };

  const isPaidActive =
    subRow?.status === 'active' &&
    (subRow.plan === 'pro' || subRow.plan === 'team') &&
    (!subRow.period_end || new Date(subRow.period_end) >= new Date());

  const programs: Program[] = (curriculumRows as CurrRow[]).map((r, idx) => {
    const meta = metaByCurriculumId.get(r.id);
    const ov = overlayByCurriculumId.get(r.id);

    const title = (r.title ?? '').trim() || `커리큘럼 #${r.id}`;
    const videoUrl = (ov?.video_url ?? r.url ?? '').trim() || undefined;
    const equipment = ov?.equipment
      ? String(ov.equipment).split('\n').map((s) => s.trim()).filter(Boolean)
      : (r.equipment ?? []).filter(Boolean);
    const steps = ov?.activity_method
      ? String(ov.activity_method).split('\n').map((s) => s.trim()).filter(Boolean)
      : (r.steps ?? []).filter(Boolean);
    const coachScript = (ov?.activity_tip ?? r.expert_tip ?? '').trim() || '';
    const fieldTips = ov?.checklist
      ? String(ov.checklist).split('\n').map((s) => s.trim()).filter(Boolean)
      : (r.check_list ?? []).filter(Boolean);

    const smColors = meta?.sm_colors;
    const colors: [string, string, string, string] =
      Array.isArray(smColors) && smColors.length === 4
        ? [smColors[0], smColors[1], smColors[2], smColors[3]]
        : pickColors(idx);

    const isProProgram = meta?.sm_is_pro ?? false;
    const lessonDetail = !isProProgram || isPaidActive
      ? {
          recommendedAge: meta?.sm_grade ?? '전학년',
          recommendedPlayers: '6-20명',
          objective: title,
          developmentFocus: meta?.sm_theme ?? '',
          coachScript,
          parentNote: coachScript,
          fieldTips,
          variations: [],
          safetyNotes: [],
          relatedSpomoveIds: [],
          videoUrl,
        }
      : undefined;

    // Merge spokedu-pro classification tags with sm_tags
    const proTags: string[] = [
      ...(Array.isArray(ov?.function_types) && ov.function_types.length > 0
        ? ov.function_types
        : ov?.function_type ? [ov.function_type] : []),
      ...(ov?.main_theme ? [ov.main_theme] : []),
      ...(ov?.group_size ? [ov.group_size] : []),
    ];
    const smTags = meta?.sm_tags ?? [];
    const tags = [...new Set([...proTags, ...smTags])];

    const thumbnailUrl = buildThumbnailUrl(videoUrl);

    return {
      id: String(r.id),
      curriculumId: r.id,
      title,
      category: meta?.sm_theme ?? (ov?.main_theme ?? '일반'),
      grade: meta?.sm_grade ?? '전학년',
      duration: meta?.sm_duration ?? 20,
      space: meta?.sm_space ?? '실내',
      description: coachScript,
      steps,
      equipment,
      tags,
      colors,
      isPro: isProProgram,
      isNew: meta?.sm_is_new ?? false,
      isHot: meta?.sm_is_hot ?? false,
      thumbnailUrl,
      lessonDetail,
    };
  });

  return NextResponse.json({ data: programs, total: programs.length });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const idRaw = searchParams.get('id');
  const curriculumId = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(curriculumId) || curriculumId <= 0) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const allowed = ['sm_tags', 'sm_theme', 'sm_grade', 'sm_space', 'sm_duration', 'sm_is_pro', 'sm_is_new', 'sm_is_hot', 'sm_display_order', 'sm_colors'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) patch[key] = body[key]; }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_program_meta')
    .upsert({ curriculum_id: curriculumId, ...patch }, { onConflict: 'curriculum_id' })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
