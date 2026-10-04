import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { CENTER_SESSION_TYPE_VALUES } from '@/app/admin/classes/lib/sessionTypeCategory';

const PRIVATE_TYPES = ['one_day', 'one_day_private', 'regular_private', 'regular_group'] as const;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function kstWeekRange(dateYmd: string): { start: Date; end: Date } {
  const kstOffset = 9 * 60 * 60 * 1000;
  const anchorMs = new Date(`${dateYmd}T12:00:00+09:00`).getTime();
  const nowKst = new Date(anchorMs + kstOffset);
  const daysFromMonday = (nowKst.getUTCDay() + 6) % 7;
  const startKst = new Date(nowKst);
  startKst.setUTCDate(nowKst.getUTCDate() - daysFromMonday);
  startKst.setUTCHours(0, 0, 0, 0);
  const endKst = new Date(startKst);
  endKst.setUTCDate(startKst.getUTCDate() + 6);
  endKst.setUTCHours(23, 59, 59, 999);
  return {
    start: new Date(startKst.getTime() - kstOffset),
    end: new Date(endKst.getTime() - kstOffset),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const date = req.nextUrl.searchParams.get('date') ?? '';
  const scope = req.nextUrl.searchParams.get('scope') === 'center' ? 'center' : 'private';
  const coachId = req.nextUrl.searchParams.get('coachId') ?? '';
  if (!YMD.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }

  const range = scope === 'center'
    ? kstWeekRange(date)
    : {
        start: new Date(`${date}T00:00:00+09:00`),
        end: new Date(`${date}T23:59:59.999+09:00`),
      };
  const types = scope === 'center' ? [...CENTER_SESSION_TYPE_VALUES] : [...PRIVATE_TYPES];

  let query = getServiceSupabase()
    .from('sessions')
    .select('id, title, start_at, end_at, status, students_text, photo_url, file_url, session_type, created_by, memo, feedback_fields, short_code, users:created_by(id, name)')
    .in('session_type', types)
    .gte('start_at', range.start.toISOString())
    .lte('start_at', range.end.toISOString())
    .order('start_at', { ascending: true });

  if (UUID.test(coachId)) {
    query = query.eq('created_by', coachId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}
