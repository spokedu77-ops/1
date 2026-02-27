/**
 * 스케줄 조회/저장 API (service_role로 RLS 무시)
 * GET ?year=2025&quarter=1 → 분기별 rotation_schedule 목록
 * POST body: { week_key, program_id, is_published?, program_snapshot? }
 * 관리자(users.role = admin | master)만 호출 가능.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { generate48WeekSlots } from '@/app/lib/admin/scheduler/dragAndDrop';

function getMonthsForQuarter(quarter: number): number[] {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

/** GET: 분기별 스케줄 목록 (관리자만, service role로 읽기) */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const quarter = Number(searchParams.get('quarter'));
    if (!Number.isFinite(year) || year < 2000 || year > 2100 || !Number.isFinite(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'year, quarter 필수 (quarter 1~4)' }, { status: 400 });
    }

    const months = getMonthsForQuarter(quarter);
    const slots = generate48WeekSlots(year);
    const weekKeys = slots.filter((s) => months.includes(s.month)).map((s) => s.weekKey);

    const supabase = getServiceSupabase();
    const { data: rows, error } = await supabase
      .from('rotation_schedule')
      .select('week_key, program_id, is_published, is_locked, program_snapshot')
      .in('week_key', weekKeys);

    if (error) {
      console.error('[admin/schedule] GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (rows || []) as { week_key: string; program_id: string | null; is_published: boolean; is_locked: boolean; program_snapshot: unknown }[];
    const programIds = list.map((r) => r.program_id).filter(Boolean) as string[];
    if (programIds.length > 0) {
      const { data: programs } = await supabase
        .from('warmup_programs_composite')
        .select('id, title')
        .in('id', programIds);
      const programMap = new Map((programs || []).map((p: { id: string; title: string }) => [p.id, p.title]));
      const enriched = list.map((schedule) => ({
        ...schedule,
        programTitle: schedule.program_id ? programMap.get(schedule.program_id) : undefined,
      }));
      return NextResponse.json(enriched);
    }
    return NextResponse.json(list);
  } catch (err) {
    console.error('[admin/schedule] GET', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** POST: 스케줄 한 건 저장 (관리자만, service role로 쓰기) */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const week_key = body?.week_key;
    const program_id = body?.program_id;
    if (typeof week_key !== 'string' || !week_key.trim() || typeof program_id !== 'string' || !program_id.trim()) {
      return NextResponse.json({ error: 'week_key, program_id 필수' }, { status: 400 });
    }

    const is_published = body?.is_published === true;
    const program_snapshot = body?.program_snapshot != null ? body.program_snapshot : {};

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('rotation_schedule')
      .upsert(
        {
          week_key,
          program_id,
          is_published,
          program_snapshot,
        },
        { onConflict: 'week_key', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      console.error('[admin/schedule] upsert error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/schedule]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
