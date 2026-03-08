/**
 * 스포키듀 프로그램 뱅크 API.
 * GET: 인증된 사용자 전체. 필터: theme_key, category, q(검색어), limit, offset.
 * POST: Admin 전용. 프로그램 추가.
 * PATCH: Admin 전용. 프로그램 수정.
 *
 * 참고: DB가 준비되기 전 단계에서는 PROGRAM_BANK 목 데이터를 반환한다.
 * DB 마이그레이션(20260308000000_spokedu_pro_commercial.sql) 적용 후
 * DB_READY = true 로 전환하여 실제 DB 사용.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import { PROGRAM_BANK, THEME_KEYS, THEME_KEY_TO_BANK_THEME } from '@/app/lib/spokedu-pro/dashboardDefaults';

/** DB 마이그레이션 적용 완료 후 true로 전환 */
const DB_READY = false;

const VALID_CATEGORIES = ['Play', 'Think', 'Grow'] as const;

export async function GET(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const themeKey = searchParams.get('theme_key') ?? '';
  const category = searchParams.get('category') ?? '';
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 200);
  const offset = Number(searchParams.get('offset') ?? '0');

  if (!DB_READY) {
    // 목 데이터 필터링
    let results = [...PROGRAM_BANK];

    if (themeKey && THEME_KEYS.includes(themeKey as (typeof THEME_KEYS)[number])) {
      const bankTheme = THEME_KEY_TO_BANK_THEME[themeKey as keyof typeof THEME_KEY_TO_BANK_THEME];
      results = results.filter((p) => p.theme === bankTheme);
    }
    if (category && VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      results = results.filter((p) => p.category === category);
    }
    if (q) {
      results = results.filter((p) =>
        p.title.toLowerCase().includes(q) || p.theme.toLowerCase().includes(q)
      );
    }

    const total = results.length;
    const page = results.slice(offset, offset + limit);
    return NextResponse.json({ data: page, total, limit, offset });
  }

  // DB 사용 시 (마이그레이션 후)
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from('spokedu_pro_programs')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .range(offset, offset + limit - 1);

  if (themeKey && THEME_KEYS.includes(themeKey as (typeof THEME_KEYS)[number])) {
    query = query.eq('theme_key', themeKey);
  }
  if (category && VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    query = query.eq('category', category);
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

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
