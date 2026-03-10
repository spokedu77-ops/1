/**
 * /api/spokedu-pro/attendance
 * GET  ?date=YYYY-MM-DD — 해당 날짜 출결 조회
 * POST { date, records: Record<studentId, status> } — 출결 일괄 저장
 *
 * DB_READY=false: spokedu_pro_tenant_content (key='attendance_YYYY-MM-DD') JSON 저장
 * DB_READY=true:  spokedu_pro_attendance 실제 테이블 사용 (UNIQUE student_id+date upsert)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getActiveCenterIdFromCookie } from '@/app/lib/server/spokeduProContext';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceRecords = Record<string, AttendanceStatus>;

const VALID_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late'];

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type SvcClient = ReturnType<typeof getServiceSupabase>;

// ── tenant_content helpers ────────────────────────────────────────────────────

function attendanceKey(date: string) { return `attendance_${date}`; }

async function loadFromContent(svc: SvcClient, userId: string, date: string): Promise<AttendanceRecords> {
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

async function saveToContent(svc: SvcClient, userId: string, date: string, records: AttendanceRecords): Promise<void> {
  await svc
    .from('spokedu_pro_tenant_content')
    .upsert(
      { owner_id: userId, key: attendanceKey(date), draft_value: { records }, draft_updated_at: new Date().toISOString() },
      { onConflict: 'owner_id,key' }
    );
}

// ── center resolution ─────────────────────────────────────────────────────────

async function resolveCenter(req: NextRequest, svc: SvcClient, userId: string): Promise<string | null> {
  const fromCookie = getActiveCenterIdFromCookie(req);
  if (fromCookie) return fromCookie;
  const { data } = await svc.from('spokedu_pro_centers').select('id').eq('owner_id', userId).maybeSingle();
  if (data?.id) return data.id;
  const { data: m } = await svc.from('spokedu_pro_center_members').select('center_id').eq('user_id', userId).limit(1).maybeSingle();
  return m?.center_id ?? null;
}

// ── GET ───────────────────────────────────────────────────────────────────────

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

    const svc = getServiceSupabase();

    if (!DB_READY) {
      const records = await loadFromContent(svc, user.id, date);
      return NextResponse.json({ ok: true, date, records });
    }

    const centerId = await resolveCenter(req, svc, user.id);
    if (!centerId) {
      return NextResponse.json({ ok: true, date, records: {} });
    }

    const { data, error } = await svc
      .from('spokedu_pro_attendance')
      .select('student_id, status')
      .eq('center_id', centerId)
      .eq('date', date);

    if (error) throw error;

    const records: AttendanceRecords = {};
    for (const row of data ?? []) {
      if (VALID_STATUSES.includes(row.status as AttendanceStatus)) {
        records[row.student_id] = row.status as AttendanceStatus;
      }
    }

    return NextResponse.json({ ok: true, date, records });
  } catch (err) {
    console.error('[attendance GET]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { date?: string; records: AttendanceRecords };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const date = body.date ?? todayISO();
    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'date 형식이 올바르지 않습니다 (YYYY-MM-DD)' }, { status: 400 });
    }

    // status 검증: 유효하지 않은 값 필터링
    const rawRecords = body.records ?? {};
    const records: AttendanceRecords = {};
    for (const [studentId, status] of Object.entries(rawRecords)) {
      if (VALID_STATUSES.includes(status as AttendanceStatus)) {
        records[studentId] = status as AttendanceStatus;
      }
    }

    const svc = getServiceSupabase();

    if (!DB_READY) {
      const existing = await loadFromContent(svc, user.id, date);
      const merged = { ...existing, ...records };
      await saveToContent(svc, user.id, date, merged);
      return NextResponse.json({ ok: true, date, records: merged });
    }

    const centerId = await resolveCenter(req, svc, user.id);
    if (!centerId) {
      return NextResponse.json({ error: '센터가 설정되지 않았습니다.' }, { status: 400 });
    }

    if (Object.keys(records).length === 0) {
      return NextResponse.json({ ok: true, date, records });
    }

    // UNIQUE (student_id, date) — upsert
    const rows = Object.entries(records).map(([studentId, status]) => ({
      student_id: studentId,
      center_id: centerId,
      date,
      status,
      recorded_by: user.id,
    }));

    const { error } = await svc
      .from('spokedu_pro_attendance')
      .upsert(rows, { onConflict: 'student_id,date' });

    if (error) throw error;

    return NextResponse.json({ ok: true, date, records });
  } catch (err) {
    console.error('[attendance POST]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
