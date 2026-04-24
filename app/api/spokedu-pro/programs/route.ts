/**
 * 스포키듀 프로그램 뱅크 API.
 * 분류: 기능 종류, 메인테마, 인원구성 (PTG는 슬로건).
 * GET: 인증된 사용자. 필터 function_type, main_theme, group_size, q.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  FUNCTION_TYPES,
  MAIN_THEMES,
  GROUP_SIZES,
  isFunctionType,
  isMainTheme,
  isGroupSize,
} from '@/app/lib/spokedu-pro/programClassification';

const DB_READY = process.env.SPOKEDU_PRO_PROGRAMS_DB_READY === 'true';

/** DB 미적용 시 목 데이터 (새 스키마 형태) */
function getFallbackPrograms() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: `프로그램 #${i + 1}`,
    video_url: null as string | null,
    function_type: FUNCTION_TYPES[i % FUNCTION_TYPES.length],
    main_theme: MAIN_THEMES[i % MAIN_THEMES.length],
    group_size: GROUP_SIZES[i % GROUP_SIZES.length],
    checklist: null as string | null,
    equipment: null as string | null,
    activity_method: null as string | null,
    activity_tip: null as string | null,
    is_published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

export async function GET(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const functionType = searchParams.get('function_type') ?? '';
  const mainTheme = searchParams.get('main_theme') ?? '';
  const groupSize = searchParams.get('group_size') ?? '';
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 200);
  const offset = Number(searchParams.get('offset') ?? '0');
  const debug = searchParams.get('debug') === '1' && process.env.NODE_ENV !== 'production';

  if (!DB_READY) {
    // 로컬/마이그레이션 전에도 "센터 커리큘럼"이 바로 보이도록 curriculum 테이블을 읽어 프로그램 형태로 제공
    // (import-center를 돌리기 전에도 /spokedu-pro가 최신 커리큘럼을 반영해야 함)
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('curriculum')
      .select('id,title,url,check_list,equipment,steps,expert_tip,display_order,month,week')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('id', { ascending: false });

    if (error) {
      // fallback이더라도 페이지는 살아야 하므로, 최소 더미를 반환
      const dummy = getFallbackPrograms();
      return NextResponse.json({
        data: dummy.slice(0, limit),
        total: dummy.length,
        limit,
        offset,
        source: 'dummy',
        debug: debug ? { sample: dummy.slice(0, 50).map((x) => ({ id: x.id, title: x.title })) } : undefined,
      });
    }

    const rows = (data ?? []) as Array<{
      id: number;
      title: string | null;
      url: string | null;
      check_list: string[] | null;
      equipment: string[] | null;
      steps: string[] | null;
      expert_tip: string | null;
      month: number | null;
      week: number | null;
    }>;

    // import-center와 동일한 기본 분류(펑셔널 무브 기준)
    const mapped = rows
      .map((r) => {
        const title = (r.title ?? '').trim();
        return {
          id: r.id,
          title,
          video_url: (r.url ?? '').trim() || null,
          function_type: '협응력',
          main_theme: '협동형',
          group_size: '소그룹',
          checklist: Array.isArray(r.check_list) ? r.check_list.filter(Boolean).join('\n') : null,
          equipment: Array.isArray(r.equipment) ? r.equipment.filter(Boolean).join('\n') : null,
          activity_method: Array.isArray(r.steps) ? r.steps.filter(Boolean).join('\n') : null,
          activity_tip: r.expert_tip?.trim() || null,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      })
      .filter((p) => (q ? p.title.toLowerCase().includes(q) : true));

    let results = mapped;
    if (functionType && isFunctionType(functionType)) results = results.filter((p) => p.function_type === functionType);
    if (mainTheme && isMainTheme(mainTheme)) results = results.filter((p) => p.main_theme === mainTheme);
    if (groupSize && isGroupSize(groupSize)) results = results.filter((p) => p.group_size === groupSize);

    const total = results.length;
    const page = results.slice(offset, offset + limit);
    return NextResponse.json({
      data: page,
      total,
      limit,
      offset,
      source: 'curriculum',
      debug: debug ? { sample: page.slice(0, 50).map((x) => ({ id: x.id, title: x.title })) } : undefined,
    });
  }

  const supabase = getServiceSupabase();
  let query = supabase
    .from('spokedu_pro_programs')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    // 최신 변경이 먼저 보이도록 정렬(센터 커리큘럼 업데이트가 즉시 눈에 띄게)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);

  const wantedFunctionType = functionType && isFunctionType(functionType) ? functionType : '';
  if (wantedFunctionType) {
    // 다중(function_types) + 단일(function_type) 모두 필터에 걸리도록 OR
    // PostgREST: cs = contains, 배열은 "{value}" 문법
    query = query.or(`function_type.eq.${wantedFunctionType},function_types.cs.{${wantedFunctionType}}`);
  }
  if (mainTheme && isMainTheme(mainTheme)) {
    query = query.eq('main_theme', mainTheme);
  }
  if (groupSize && isGroupSize(groupSize)) {
    query = query.eq('group_size', groupSize);
  }
  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  let { data, count, error } = await query;
  // DB 마이그레이션이 아직 적용되지 않은 환경(컬럼 없음)에서는 function_types 조건이 실패할 수 있으므로
  // 기존 단일 컬럼(function_type)만으로 즉시 폴백한다.
  if (error && wantedFunctionType && /function_types|column .*function_types/i.test(error.message)) {
    let fallback = supabase
      .from('spokedu_pro_programs')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1)
      .eq('function_type', wantedFunctionType);
    if (mainTheme && isMainTheme(mainTheme)) fallback = fallback.eq('main_theme', mainTheme);
    if (groupSize && isGroupSize(groupSize)) fallback = fallback.eq('group_size', groupSize);
    if (q) fallback = fallback.ilike('title', `%${q}%`);
    const again = await fallback;
    data = again.data;
    count = again.count;
    error = again.error;
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    limit,
    offset,
    source: 'db',
    debug: debug ? { sample: (data ?? []).slice(0, 50).map((x: { id?: number; title?: string }) => ({ id: x.id, title: x.title })) } : undefined,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!DB_READY) {
    return NextResponse.json({ error: 'DB not ready. Apply migration first.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('spokedu_pro_programs').insert(body as object).select().single();
  if (error || data == null) {
    return NextResponse.json({ error: error?.message ?? 'Insert returned no row' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!DB_READY) {
    return NextResponse.json({ error: 'DB not ready. Apply migration first.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_pro_programs')
    .update(body as object)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (data == null) {
    return NextResponse.json({ error: 'Update returned no row' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
