/**
 * GET /api/spokedu-pro/attendance/range?days=30
 * 최근 N일(기본 30, 최대 90) 일별 출결 records 반환 — 대시보드 그래프용
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceRecords = Record<string, AttendanceStatus>;

function attendanceKey(date: string) {
  return `attendance_${date}`;
}

async function loadRecords(
  serviceSupabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  date: string
): Promise<AttendanceRecords> {
  const { data } = await serviceSupabase
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', attendanceKey(date))
    .maybeSingle();
  if (!data) return {};
  const val = data.draft_value as { records?: AttendanceRecords };
  return val?.records ?? {};
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const daysRaw = parseInt(url.searchParams.get('days') ?? '30', 10);
  const days = Math.min(90, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 30));

  const serviceSupabase = getServiceSupabase();
  const start = addDays(todayStart(), -(days - 1));
  const out: { date: string; records: AttendanceRecords }[] = [];

  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const date = toISODate(d);
    const records = await loadRecords(serviceSupabase, user.id, date);
    out.push({ date, records });
  }

  return NextResponse.json({ ok: true, days: out });
}
