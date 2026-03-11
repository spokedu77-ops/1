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

  if (!DB_READY) {
    let results = getFallbackPrograms();
    if (functionType && isFunctionType(functionType)) {
      results = results.filter((p) => p.function_type === functionType);
    }
    if (mainTheme && isMainTheme(mainTheme)) {
      results = results.filter((p) => p.main_theme === mainTheme);
    }
    if (groupSize && isGroupSize(groupSize)) {
      results = results.filter((p) => p.group_size === groupSize);
    }
    if (q) {
      results = results.filter((p) => p.title.toLowerCase().includes(q));
    }
    const total = results.length;
    const page = results.slice(offset, offset + limit);
    return NextResponse.json({ data: page, total, limit, offset });
  }

  const supabase = getServiceSupabase();
  let query = supabase
    .from('spokedu_pro_programs')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .range(offset, offset + limit - 1);

  if (functionType && isFunctionType(functionType)) {
    query = query.eq('function_type', functionType);
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

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0, limit, offset });
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
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
