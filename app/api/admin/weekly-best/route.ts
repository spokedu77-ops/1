import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type WeeklyBestPayload = {
  title?: string;
  content?: string | null;
  lesson_plan_session_id?: string | null;
  photo_urls?: string[];
  feedback_session_id?: string | null;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as WeeklyBestPayload | null;
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'title이 필요합니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const payload = {
    title: body.title.trim(),
    content: typeof body.content === 'string' ? body.content : null,
    lesson_plan_session_id: typeof body.lesson_plan_session_id === 'string' && body.lesson_plan_session_id.trim()
      ? body.lesson_plan_session_id.trim()
      : null,
    photo_urls: Array.isArray(body.photo_urls) ? body.photo_urls.filter((v): v is string => typeof v === 'string' && !!v) : [],
    feedback_session_id: typeof body.feedback_session_id === 'string' && body.feedback_session_id.trim()
      ? body.feedback_session_id.trim()
      : null,
  };

  const { data, error } = await supabase
    .from('weekly_best')
    .insert([payload])
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ weeklyBest: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as (WeeklyBestPayload & { id?: string }) | null;
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body?.title === 'string') update.title = body.title;
  if ('content' in (body ?? {})) update.content = typeof body?.content === 'string' ? body.content : null;
  if ('lesson_plan_session_id' in (body ?? {})) {
    update.lesson_plan_session_id =
      typeof body?.lesson_plan_session_id === 'string' && body.lesson_plan_session_id.trim()
        ? body.lesson_plan_session_id.trim()
        : null;
  }
  if (Array.isArray(body?.photo_urls)) update.photo_urls = body.photo_urls.filter((v): v is string => typeof v === 'string' && !!v);
  if ('feedback_session_id' in (body ?? {})) {
    update.feedback_session_id =
      typeof body?.feedback_session_id === 'string' && body.feedback_session_id.trim()
        ? body.feedback_session_id.trim()
        : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('weekly_best')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ weeklyBest: data }, { status: 200 });
}

