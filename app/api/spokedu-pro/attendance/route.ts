/**
 * /api/spokedu-pro/attendance
 * GET  ?date=YYYY-MM-DD — 해당 날짜 출결 조회
 * POST { date, records: Record<studentId, status> } — 출결 일괄 저장
 *
 * 저장소: spokedu_pro_tenant_content (key='attendance_YYYY-MM-DD')
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceRecords = Record<string, AttendanceStatus>;

const VALID_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late'];

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function attendanceKey(date: string) {
  return `attendance_${date}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

// GET /api/spokedu-pro/attendance?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const date = url.searchParams.get('date') ?? todayISO();

    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'date 형식이 올바르지 않습니다 (YYYY-MM-DD)' }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();
    const records = await loadRecords(serviceSupabase, user.id, date);

    return NextResponse.json({ ok: true, date, records });
  } catch (err) {
    console.error('[attendance GET]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/spokedu-pro/attendance
export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { date?: string; records: AttendanceRecords };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const date = body.date ?? todayISO();

    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'date 형식이 올바르지 않습니다 (YYYY-MM-DD)' }, { status: 400 });
    }

    const rawRecords = body.records ?? {};

    // status enum 검증: 유효하지 않은 값은 필터링
    const records: AttendanceRecords = {};
    for (const [studentId, status] of Object.entries(rawRecords)) {
      if (VALID_STATUSES.includes(status as AttendanceStatus)) {
        records[studentId] = status as AttendanceStatus;
      }
    }

    // Merge with existing (partial update OK)
    const serviceSupabase = getServiceSupabase();
    const existing = await loadRecords(serviceSupabase, user.id, date);
    const merged = { ...existing, ...records };

    await serviceSupabase
      .from('spokedu_pro_tenant_content')
      .upsert(
        {
          owner_id: user.id,
          key: attendanceKey(date),
          draft_value: { records: merged },
          draft_updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id,key' }
      );

    return NextResponse.json({ ok: true, date, records: merged });
  } catch (err) {
    console.error('[attendance POST]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
