import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type TeacherJoin = { id: string; name: string } | { id: string; name: string }[] | null;

function resolveTeacherName(teacher: TeacherJoin): string {
  if (!teacher) return '(강사 미상)';
  if (Array.isArray(teacher)) return teacher[0]?.name ?? '(강사 미상)';
  return teacher.name;
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parseOffset(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = parsePositiveInt(searchParams.get('limit'), 50, 200);
  const offset = parseOffset(searchParams.get('offset'));

  const supabase = getServiceSupabase();
  const today = new Date().toISOString().split('T')[0];

  const { data, count, error } = await supabase
    .from('postpone_notices')
    .select('id, notice_date, memo, teacher:teacher_id(id, name)', { count: 'exact' })
    .gte('notice_date', today)
    .order('notice_date', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notices = (data ?? []).map((row: {
    id: string;
    notice_date: string;
    memo: string | null;
    teacher: TeacherJoin;
  }) => ({
    id: row.id,
    notice_date: row.notice_date,
    memo: row.memo,
    teacher_name: resolveTeacherName(row.teacher),
  }));

  return NextResponse.json({
    notices,
    total: count ?? 0,
    limit,
    offset,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || !body.teacher_id || !body.notice_date) {
    return NextResponse.json({ error: '필수 항목 누락 (teacher_id, notice_date)' }, { status: 400 });
  }

  const { teacher_id, notice_date, memo } = body as {
    teacher_id: string;
    notice_date: string;
    memo?: string;
  };

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('postpone_notices')
    .insert({ teacher_id, notice_date, memo: memo ?? null })
    .select('id, notice_date, memo, teacher:teacher_id(id, name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = data as unknown as {
    id: string;
    notice_date: string;
    memo: string | null;
    teacher: TeacherJoin;
  };

  return NextResponse.json({
    notice: {
      id: row.id,
      notice_date: row.notice_date,
      memo: row.memo,
      teacher_name: resolveTeacherName(row.teacher),
    },
  }, { status: 201 });
}
