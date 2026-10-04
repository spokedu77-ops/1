import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const RANGE_COLUMNS = 'id, title, start_at, end_at, session_type, group_id, students_text, memo, status, price, mileage_option, round_index, round_total, users:created_by(id, name)';
const GROUP_COLUMNS = 'id, group_id, title, start_at, end_at, status, created_by, price, round_index, round_total, sequence_number, session_type, memo, mileage_option';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const groupIds = (req.nextUrl.searchParams.get('groupIds') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => UUID.test(id))
    .slice(0, 40);

  if (req.nextUrl.searchParams.has('groupIds')) {
    if (groupIds.length === 0) {
      return NextResponse.json({ error: 'invalid_group' }, { status: 400 });
    }
    const { data, error } = await getServiceSupabase()
      .from('sessions')
      .select(GROUP_COLUMNS)
      .in('group_id', groupIds)
      .order('start_at', { ascending: true })
      .limit(1000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sessions: data ?? [] });
  }

  const start = req.nextUrl.searchParams.get('start') ?? '';
  const end = req.nextUrl.searchParams.get('end') ?? '';
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? '0');
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '1000');
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) {
    return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 20000) {
    return NextResponse.json({ error: 'invalid_offset' }, { status: 400 });
  }
  const pageSize = Number.isInteger(limit) ? Math.min(1000, Math.max(1, limit)) : 1000;

  const { data, error } = await getServiceSupabase()
    .from('sessions')
    .select(RANGE_COLUMNS)
    .gte('start_at', new Date(start).toISOString())
    .lte('start_at', new Date(end).toISOString())
    .order('start_at', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}
