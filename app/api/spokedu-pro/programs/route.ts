/**
 * 스포키듀 프로그램 뱅크 API.
 * 분류: 신체 기능(function_type / function_types), 활동 테마(main_theme), 인원(group_size), 활용 교구(equipment).
 * GET: 인증된 사용자. 필터 function_type | function_types, main_theme, group_size, equipment, q.
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
  isEquipmentCatalogItem,
} from '@/app/lib/spokedu-pro/programClassification';
import { stripMonthWeekPrefix } from '@/app/lib/spokedu-pro/titleSanitizer';

const DB_READY = process.env.SPOKEDU_PRO_PROGRAMS_DB_READY === 'true';

/** 본편 curriculum과 동일 제목·URL(정규화) 키 — Pro 뱅크 찌꺼기(커리큘럼에 없는 행) 검색 제외용 */
function programCurriculumKey(title: string, videoUrl: string | null | undefined): string {
  const t = stripMonthWeekPrefix(String(title ?? '').trim());
  const u = String(videoUrl ?? '').trim();
  return `${t}|${u}`;
}

/** only_curriculum=1: 본편 curriculum(title,url,id)과 맞는 프로그램만 남김 */
async function filterProgramsToMainCurriculum(
  supabase: ReturnType<typeof getServiceSupabase>,
  rows: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  const { data: curr, error } = await supabase.from('curriculum').select('id,title,url').eq('is_sub', false);
  if (error) return rows;
  if (!curr?.length) return [];
  const keySet = new Set<string>();
  const idSet = new Set<number>();
  for (const r of curr as Array<{ id: number; title?: string | null; url?: string | null }>) {
    idSet.add(Number(r.id));
    const t = stripMonthWeekPrefix(String(r.title ?? '').trim());
    if (t) keySet.add(programCurriculumKey(t, r.url ?? ''));
  }
  return rows.filter((row) => {
    const title = String(row.title ?? '');
    const url = row.video_url as string | null | undefined;
    if (keySet.has(programCurriculumKey(title, url))) return true;
    const sid = Number(row.source_center_curriculum_id);
    if (Number.isFinite(sid) && idSet.has(sid)) return true;
    return false;
  });
}

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

/** function_types=순발력,민첩성 우선, 없으면 단일 function_type */
function resolveFunctionTypesForFilter(searchParams: URLSearchParams): string[] {
  const fromMulti = (searchParams.get('function_types') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter(isFunctionType);
  if (fromMulti.length) return fromMulti;
  const single = searchParams.get('function_type') ?? '';
  return single && isFunctionType(single) ? [single] : [];
}

function resolveEquipmentTokens(searchParams: URLSearchParams): string[] {
  return (searchParams.get('equipment') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter(isEquipmentCatalogItem);
}

function functionTypeOrClause(types: string[]): string {
  return types.flatMap((t) => [`function_type.eq.${t}`, `function_types.cs.{${t}}`]).join(',');
}

function equipmentOrClause(tokens: string[]): string {
  return tokens.map((t) => `equipment.ilike.%${t}%`).join(',');
}

export async function GET(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resolvedFunctionTypes = resolveFunctionTypesForFilter(searchParams);
  const equipmentTokens = resolveEquipmentTokens(searchParams);
  const mainTheme = searchParams.get('main_theme') ?? '';
  const groupSize = searchParams.get('group_size') ?? '';
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 200);
  const offset = Number(searchParams.get('offset') ?? '0');
  const onlyCurriculum = searchParams.get('only_curriculum') === '1';
  const debug = searchParams.get('debug') === '1' && process.env.NODE_ENV !== 'production';

  if (!DB_READY) {
    // 로컬/마이그레이션 전에도 "센터 커리큘럼"이 바로 보이도록 curriculum 테이블을 읽어 프로그램 형태로 제공
    // (import-center를 돌리기 전에도 /spokedu-pro가 최신 커리큘럼을 반영해야 함)
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('curriculum')
      .select('id,title,url,check_list,equipment,steps,expert_tip,display_order,month,week,is_sub')
      .eq('is_sub', false)
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
        const title = stripMonthWeekPrefix((r.title ?? '').trim());
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
    if (resolvedFunctionTypes.length) {
      results = results.filter((p) => resolvedFunctionTypes.includes(String(p.function_type)));
    }
    if (mainTheme && isMainTheme(mainTheme)) results = results.filter((p) => p.main_theme === mainTheme);
    if (groupSize && isGroupSize(groupSize)) results = results.filter((p) => p.group_size === groupSize);
    if (equipmentTokens.length) {
      results = results.filter((p) => {
        const eqText = String(p.equipment ?? '');
        return equipmentTokens.some((tok) => eqText.includes(tok));
      });
    }

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
    .eq('center_curriculum_is_sub', false)
    // 최신 변경이 먼저 보이도록 정렬(센터 커리큘럼 업데이트가 즉시 눈에 띄게)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);

  if (resolvedFunctionTypes.length) {
    // 다중(function_types) + 단일(function_type) 모두 필터에 걸리도록 OR (복수 타입은 타입별 OR)
    query = query.or(functionTypeOrClause(resolvedFunctionTypes));
  }
  if (mainTheme && isMainTheme(mainTheme)) {
    query = query.eq('main_theme', mainTheme);
  }
  if (groupSize && isGroupSize(groupSize)) {
    query = query.eq('group_size', groupSize);
  }
  if (equipmentTokens.length === 1) {
    query = query.ilike('equipment', `%${equipmentTokens[0]}%`);
  } else if (equipmentTokens.length > 1) {
    query = query.or(equipmentOrClause(equipmentTokens));
  }
  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  let { data, count, error } = await query;
  // center_curriculum_is_sub 컬럼이 아직 없는 DB는 SUB 제외 조건 없이 재시도
  if (error && /center_curriculum_is_sub|42703|column/i.test(String(error.message))) {
    let q2 = supabase
      .from('spokedu_pro_programs')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);
    if (resolvedFunctionTypes.length) {
      q2 = q2.or(functionTypeOrClause(resolvedFunctionTypes));
    }
    if (mainTheme && isMainTheme(mainTheme)) q2 = q2.eq('main_theme', mainTheme);
    if (groupSize && isGroupSize(groupSize)) q2 = q2.eq('group_size', groupSize);
    if (equipmentTokens.length === 1) q2 = q2.ilike('equipment', `%${equipmentTokens[0]}%`);
    else if (equipmentTokens.length > 1) q2 = q2.or(equipmentOrClause(equipmentTokens));
    if (q) q2 = q2.ilike('title', `%${q}%`);
    const second = await q2;
    data = second.data;
    count = second.count;
    error = second.error;
  }
  // DB 마이그레이션이 아직 적용되지 않은 환경(컬럼 없음)에서는 function_types 조건이 실패할 수 있으므로
  // 기존 단일 컬럼(function_type)만으로 즉시 폴백한다.
  if (error && resolvedFunctionTypes.length && /function_types|column .*function_types/i.test(error.message)) {
    let fallback = supabase
      .from('spokedu_pro_programs')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);
    if (resolvedFunctionTypes.length === 1) {
      fallback = fallback.eq('function_type', resolvedFunctionTypes[0]);
    } else {
      fallback = fallback.or(resolvedFunctionTypes.map((t) => `function_type.eq.${t}`).join(','));
    }
    if (mainTheme && isMainTheme(mainTheme)) fallback = fallback.eq('main_theme', mainTheme);
    if (groupSize && isGroupSize(groupSize)) fallback = fallback.eq('group_size', groupSize);
    if (equipmentTokens.length === 1) fallback = fallback.ilike('equipment', `%${equipmentTokens[0]}%`);
    else if (equipmentTokens.length > 1) fallback = fallback.or(equipmentOrClause(equipmentTokens));
    if (q) fallback = fallback.ilike('title', `%${q}%`);
    const again = await fallback;
    data = again.data;
    count = again.count;
    error = again.error;
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rawRows = (data ?? []) as Array<Record<string, unknown> & { title?: string }>;
  if (onlyCurriculum && DB_READY) {
    rawRows = await filterProgramsToMainCurriculum(supabase, rawRows);
  }

  const normalized = rawRows.map((row) => ({
    ...row,
    title: stripMonthWeekPrefix(String(row.title ?? '')),
  }));

  const totalOut = onlyCurriculum && DB_READY ? normalized.length : count ?? 0;

  return NextResponse.json({
    data: normalized,
    total: totalOut,
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
