/**
 * /api/spokedu-pro/attendance
 * GET  ?date=YYYY-MM-DD — 해당 날짜 출결 조회
 * POST { date, records: Record<studentId, status> } — 출결 일괄 upsert
 *
 * DB_READY=true: spokedu_pro_attendance 테이블 사용
 * DB_READY=false: 레거시 JSON blob fallback (spokedu_pro_tenant_content)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getActiveCenterIdFromCookie, getCenterMemberRole, type SupabaseClientForMemberRole } from '@/app/lib/server/spokeduProContext';

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceRecords = Record<string, AttendanceStatus>;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Legacy blob helpers ──────────────────────────────────────────────────────

function attendanceKey(date: string) {
  return `attendance_${date}`;
}

async function legacyLoad(
  svc: ReturnType<typeof getServiceSupabase>,
  userId: string,
  date: string
): Promise<AttendanceRecords> {
  const { data } = await svc
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', attendanceKey(date))
    .maybeSingle();
  if (!data) return {};
  const val = data.draft_value as { records?: AttendanceRecords };
  return val?.records ?? {};
}

// ─── GET /api/spokedu-pro/attendance?date=YYYY-MM-DD ─────────────────────────

export async function GET(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? todayISO();

  const svc = getServiceSupabase();
  const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

  if (!DB_READY) {
    const records = await legacyLoad(svc, user.id, date);
    return NextResponse.json({ ok: true, date, records });
  }

  // DB mode: resolve center
  const cookieCenterId = getActiveCenterIdFromCookie(request);
  let centerId: string | null = cookieCenterId;
  if (!centerId) {
    const { data: center } = await svc
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    centerId = center?.id ?? null;
  }
  if (!centerId) return NextResponse.json({ ok: true, date, records: {} });

  const role = await getCenterMemberRole(svc as unknown as SupabaseClientForMemberRole, centerId, user.id);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await svc
    .from('spokedu_pro_attendance')
    .select('student_id, status')
    .eq('center_id', centerId)
    .eq('date', date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const records: AttendanceRecords = {};
  for (const row of data ?? []) {
    records[row.student_id as string] = row.status as AttendanceStatus;
  }

  return NextResponse.json({ ok: true, date, records });
}

// ─── POST /api/spokedu-pro/attendance ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { date?: string; records: AttendanceRecords };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const date = body.date ?? todayISO();
  const records = body.records ?? {};

  const svc = getServiceSupabase();
  const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

  if (!DB_READY) {
    // Merge with existing
    const existing = await legacyLoad(svc, user.id, date);
    const merged = { ...existing, ...records };
    await svc.from('spokedu_pro_tenant_content').upsert(
      {
        owner_id: user.id,
        key: attendanceKey(date),
        draft_value: { records: merged },
        draft_updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,key' }
    );
    return NextResponse.json({ ok: true, date, records: merged });
  }

  // DB mode: resolve center
  const cookieCenterId = getActiveCenterIdFromCookie(request);
  let centerId: string | null = cookieCenterId;
  if (!centerId) {
    const { data: center } = await svc
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    centerId = center?.id ?? null;
  }
  if (!centerId) return NextResponse.json({ error: 'Center not found' }, { status: 404 });

  const role = await getCenterMemberRole(svc as unknown as SupabaseClientForMemberRole, centerId, user.id);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Upsert each record (UNIQUE student_id+date)
  const upsertRows = Object.entries(records).map(([studentId, status]) => ({
    center_id: centerId,
    student_id: studentId,
    date,
    status,
  }));

  if (upsertRows.length > 0) {
    const { error } = await svc
      .from('spokedu_pro_attendance')
      .upsert(upsertRows, { onConflict: 'student_id,date' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, date, records });
}
