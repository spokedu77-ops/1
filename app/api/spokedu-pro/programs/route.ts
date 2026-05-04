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
import {
  mapLessonDetailRowToClient,
  type ProgramLessonDetailRow,
} from '@/app/lib/spokedu-pro/programLessonDetail';
import { isLessonPackageKeyId } from '@/app/lib/spokedu-pro/lessonPackageKeys';

const DB_READY = process.env.SPOKEDU_PRO_PROGRAMS_DB_READY === 'true';

/** URL `curriculumIds=1,2,3` — curriculum.id 기준으로 목록 제한(드로어 하이드레이션 등) */
function parseCurriculumIdsParam(searchParams: URLSearchParams): number[] | null {
  const raw = (searchParams.get('curriculumIds') ?? '').trim();
  if (!raw) return null;
  const ids = raw
    .split(',')
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ids.length > 0 ? ids.slice(0, 120) : null;
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

export async function GET(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const authResult = await serverSupabase.auth.getUser();
  const user = authResult.data?.user ?? null;
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
  const debug = searchParams.get('debug') === '1' && process.env.NODE_ENV !== 'production';
  const wantFeaturedLesson = searchParams.get('featuredLesson') === '1';
  const wantHasLessonDetail = searchParams.get('hasLessonDetail') === '1';
  const packageKeyRaw = (searchParams.get('packageKey') ?? '').trim();
  const packageKeyFilter =
    packageKeyRaw && isLessonPackageKeyId(packageKeyRaw) ? packageKeyRaw : null;
  const curriculumIdsParam = parseCurriculumIdsParam(searchParams);

  const lessonDetailFilterActive =
    wantFeaturedLesson || wantHasLessonDetail || packageKeyFilter != null;

  // 구독자 프로그램 뱅크 GET: 항상 센터 본편 커리큘럼(curriculum, is_sub=false).
  // spokedu_pro_programs는 import-center·관리자 POST/PATCH(DB_READY)용이며 목록 소스로 쓰지 않는다.
  const supabase = getServiceSupabase();

  /**
   * lesson_detail 기반 curriculum.id 제한.
   * - 쿼리 실패 시: 목록 깨짐 방지를 위해 제한 없음(전체 커리큘럼)으로 폴백.
   * - 성공 시 빈 배열: 요청한 lesson 필터에 해당하는 프로그램 없음 → 빈 응답.
   */
  let lessonTableCurriculumIds: number[] | null = null;
  let lessonTableQueryResolved = false;
  if (lessonDetailFilterActive) {
    let ldQuery = supabase.from('spokedu_pro_program_lesson_details').select('curriculum_id');
    if (wantFeaturedLesson) {
      ldQuery = ldQuery.eq('is_featured_lesson', true);
    }
    if (packageKeyFilter) {
      ldQuery = ldQuery.contains('package_keys', [packageKeyFilter]);
    }
    // hasLessonDetail만 단독이면 테이블에 행이 있는 curriculum만 (추가 where 없음)
    const { data: ldRows, error: ldErr } = await ldQuery;
    if (ldErr) {
      lessonTableCurriculumIds = null;
      lessonTableQueryResolved = false;
    } else {
      lessonTableCurriculumIds = [
        ...new Set(
          (ldRows ?? [])
            .map((r: { curriculum_id?: number }) => r.curriculum_id)
            .filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0)
        ),
      ];
      lessonTableQueryResolved = true;
    }
  }

  if (lessonDetailFilterActive && lessonTableQueryResolved && (lessonTableCurriculumIds?.length ?? 0) === 0) {
    return NextResponse.json({
      data: [],
      total: 0,
      limit,
      offset,
      source: 'curriculum',
      debug: debug ? { sample: [], lessonDetailFilter: true } : undefined,
    });
  }

  let restrictCurriculumIds: number[] | null =
    lessonDetailFilterActive && lessonTableQueryResolved ? lessonTableCurriculumIds : null;

  if (curriculumIdsParam != null && curriculumIdsParam.length > 0) {
    const setUrl = new Set(curriculumIdsParam);
    if (restrictCurriculumIds != null) {
      restrictCurriculumIds = restrictCurriculumIds.filter((id) => setUrl.has(id));
    } else {
      restrictCurriculumIds = curriculumIdsParam;
    }
  }

  if (
    restrictCurriculumIds != null &&
    restrictCurriculumIds.length === 0 &&
    (lessonDetailFilterActive || (curriculumIdsParam != null && curriculumIdsParam.length > 0))
  ) {
    return NextResponse.json({
      data: [],
      total: 0,
      limit,
      offset,
      source: 'curriculum',
      debug: debug ? { sample: [], filtered: true } : undefined,
    });
  }

  let curriculumQuery = supabase
    .from('curriculum')
    .select('id,title,url,check_list,equipment,steps,expert_tip,display_order,month,week,is_sub')
    .eq('is_sub', false);
  if (restrictCurriculumIds != null && restrictCurriculumIds.length > 0) {
    curriculumQuery = curriculumQuery.in('id', restrictCurriculumIds);
  }
  const { data: curriculumRowsRaw, error } = await curriculumQuery
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

  const rows = (curriculumRowsRaw ?? []) as Array<{
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

  const curriculumIds = rows.map((r) => r.id).filter((n) => Number.isFinite(n));
  type ProgramOverlay = {
    source_center_curriculum_id: number | null;
    title: string | null;
    video_url: string | null;
    function_type: string | null;
    function_types: string[] | null;
    main_theme: string | null;
    group_size: string | null;
    checklist: string | null;
    equipment: string | null;
    activity_method: string | null;
    activity_tip: string | null;
    updated_at: string | null;
  };
  const overlayByCurriculumId = new Map<number, ProgramOverlay>();
  if (curriculumIds.length > 0) {
    const { data: overlayRows } = await supabase
      .from('spokedu_pro_programs')
      .select(
        'source_center_curriculum_id,title,video_url,function_type,function_types,main_theme,group_size,checklist,equipment,activity_method,activity_tip,updated_at'
      )
      .in('source_center_curriculum_id', curriculumIds);
    for (const o of (overlayRows ?? []) as ProgramOverlay[]) {
      const cid = o.source_center_curriculum_id;
      if (cid == null) continue;
      const prev = overlayByCurriculumId.get(cid);
      if (!prev) {
        overlayByCurriculumId.set(cid, o);
        continue;
      }
      const prevT = prev.updated_at ? Date.parse(prev.updated_at) : 0;
      const nextT = o.updated_at ? Date.parse(o.updated_at) : 0;
      if (nextT >= prevT) overlayByCurriculumId.set(cid, o);
    }
  }

  // import-center와 동일한 기본 분류(펑셔널 무브 기준) + spokedu_pro_programs 오버레이
  const mapped = rows
    .map((r) => {
      const title = stripMonthWeekPrefix((r.title ?? '').trim());
      const ov = overlayByCurriculumId.get(r.id);
      const baseChecklist = Array.isArray(r.check_list) ? r.check_list.filter(Boolean).join('\n') : null;
      const baseEquipment = Array.isArray(r.equipment) ? r.equipment.filter(Boolean).join('\n') : null;
      const baseMethod = Array.isArray(r.steps) ? r.steps.filter(Boolean).join('\n') : null;
      const baseTip = r.expert_tip?.trim() || null;
      const fnTypes =
        Array.isArray(ov?.function_types) && ov.function_types.length > 0
          ? ov.function_types.filter((x) => typeof x === 'string' && x.trim())
          : null;
      const primaryFn = (ov?.function_type ?? '').trim() || (fnTypes?.[0] ?? '') || '협응력';
      return {
        id: r.id,
        title: (ov?.title ?? '').trim() || title,
        video_url: ((ov?.video_url ?? r.url) ?? '').trim() || null,
        function_type: primaryFn,
        function_types: fnTypes ?? undefined,
        main_theme: (ov?.main_theme ?? '').trim() || '협동형',
        group_size: (ov?.group_size ?? '').trim() || '소그룹',
        checklist: ov?.checklist != null && String(ov.checklist).trim() ? ov.checklist : baseChecklist,
        equipment: ov?.equipment != null && String(ov.equipment).trim() ? ov.equipment : baseEquipment,
        activity_method:
          ov?.activity_method != null && String(ov.activity_method).trim()
            ? ov.activity_method
            : baseMethod,
        activity_tip: ov?.activity_tip != null && String(ov.activity_tip).trim() ? ov.activity_tip : baseTip,
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    })
    .filter((p) => (q ? p.title.toLowerCase().includes(q) : true));

  let results = mapped;
  if (resolvedFunctionTypes.length) {
    results = results.filter((p) => {
      const multi = Array.isArray(p.function_types) ? p.function_types : [];
      return resolvedFunctionTypes.some(
        (ft) => ft === String(p.function_type) || multi.includes(ft)
      );
    });
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

  const lessonByCurriculumId = new Map<number, ReturnType<typeof mapLessonDetailRowToClient>>();
  const pageIds = page.map((p) => p.id).filter((n) => Number.isFinite(n));
  if (pageIds.length > 0) {
    const { data: lessonRows, error: lessonErr } = await supabase
      .from('spokedu_pro_program_lesson_details')
      .select('*')
      .in('curriculum_id', pageIds);
    if (!lessonErr && Array.isArray(lessonRows)) {
      for (const r of lessonRows as ProgramLessonDetailRow[]) {
        lessonByCurriculumId.set(r.curriculum_id, mapLessonDetailRowToClient(r));
      }
    }
  }

  const programs = page.map((p) => ({
    ...p,
    lesson_detail: lessonByCurriculumId.get(p.id) ?? null,
  }));

  return NextResponse.json({
    data: programs,
    total,
    limit,
    offset,
    source: 'curriculum',
    debug: debug ? { sample: programs.slice(0, 50).map((x) => ({ id: x.id, title: x.title })) } : undefined,
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
  const programRowIdRaw = (searchParams.get('programRowId') ?? '').trim();
  const programRowId =
    programRowIdRaw !== '' ? Number(programRowIdRaw) : Number.NaN;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  delete patch.id;

  const supabase = getServiceSupabase();

  /** spokedu_pro_programs PK로만 갱신(선택). GET 목록 id는 curriculum.id이므로 기본 PATCH는 이 경로를 쓰지 않는다. */
  if (Number.isFinite(programRowId) && programRowId > 0) {
    const { data: byPk, error: errPk } = await supabase
      .from('spokedu_pro_programs')
      .update(patch)
      .eq('id', programRowId)
      .select();

    if (errPk) {
      return NextResponse.json({ error: errPk.message }, { status: 500 });
    }
    if (byPk && byPk.length > 0) {
      return NextResponse.json({ data: byPk[0] });
    }
    return NextResponse.json({ error: 'Program row not found' }, { status: 404 });
  }

  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  // 기본: id = curriculum.id → source_center_curriculum_id로 오버레이 행을 찾는다.
  const { data: bySource, error: errSource } = await supabase
    .from('spokedu_pro_programs')
    .update(patch)
    .eq('source_center_curriculum_id', numericId)
    .select();

  if (errSource) {
    return NextResponse.json({ error: errSource.message }, { status: 500 });
  }
  if (bySource && bySource.length > 0) {
    return NextResponse.json({ data: bySource[0] });
  }

  // 오버레이 행이 없으면 커리큘럼 본편에 맞춰 새 행을 만든다 (GET 목록 id = curriculum.id 유지).
  const { data: curr, error: currErr } = await supabase
    .from('curriculum')
    .select('id,title,url')
    .eq('id', numericId)
    .eq('is_sub', false)
    .maybeSingle();

  if (currErr) {
    return NextResponse.json({ error: currErr.message }, { status: 500 });
  }
  if (curr == null) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  const defaultTitle = stripMonthWeekPrefix((curr.title ?? '').trim()) || `커리큘럼 #${numericId}`;
  const defaultVideo = (curr.url ?? '').trim() || null;
  const insertRow: Record<string, unknown> = {
    ...patch,
    title: typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim() : defaultTitle,
    video_url:
      typeof patch.video_url === 'string' && patch.video_url.trim()
        ? patch.video_url.trim()
        : defaultVideo,
    source_center_curriculum_id: numericId,
    is_published: true,
  };
  delete insertRow.id;

  const { data: inserted, error: insErr } = await supabase
    .from('spokedu_pro_programs')
    .insert(insertRow)
    .select()
    .maybeSingle();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  if (inserted == null) {
    return NextResponse.json({ error: 'Insert returned no row' }, { status: 500 });
  }

  return NextResponse.json({ data: inserted });
}
