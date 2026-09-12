import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type WeeklyBestPayload = {
  title?: string;
  content?: string | null;
  lesson_plan_session_id?: string | null;
  photo_urls?: string[];
  photo_session_id?: string | null;
  feedback_session_id?: string | null;
  feedback_note?: string | null;
};

function isMissingPhotoSessionColumn(message: string): boolean {
  return /photo_session_id/i.test(message) && /column|schema|does not exist/i.test(message);
}

function optionalSessionId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

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
    lesson_plan_session_id: optionalSessionId(body.lesson_plan_session_id),
    photo_urls: Array.isArray(body.photo_urls) ? body.photo_urls.filter((v): v is string => typeof v === 'string' && !!v) : [],
    photo_session_id: optionalSessionId(body.photo_session_id),
    feedback_session_id: optionalSessionId(body.feedback_session_id),
    feedback_note:
      typeof body.feedback_note === 'string' && body.feedback_note.trim()
        ? body.feedback_note.trim()
        : null,
  };

  const { data, error } = await supabase
    .from('weekly_best')
    .insert([payload])
    .select('*')
    .single();

  if (error && isMissingPhotoSessionColumn(error.message)) {
    const { photo_session_id: _omit, ...withoutPhotoSession } = payload;
    void _omit;
    const retry = await supabase.from('weekly_best').insert([withoutPhotoSession]).select('*').single();
    if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
    return NextResponse.json({ weeklyBest: retry.data }, { status: 201 });
  }

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
    update.lesson_plan_session_id = optionalSessionId(body?.lesson_plan_session_id);
  }
  if (Array.isArray(body?.photo_urls)) update.photo_urls = body.photo_urls.filter((v): v is string => typeof v === 'string' && !!v);
  if ('photo_session_id' in (body ?? {})) {
    update.photo_session_id = optionalSessionId(body?.photo_session_id);
  }
  if ('feedback_session_id' in (body ?? {})) {
    update.feedback_session_id = optionalSessionId(body?.feedback_session_id);
  }
  if ('feedback_note' in (body ?? {})) {
    update.feedback_note =
      typeof body?.feedback_note === 'string' && body.feedback_note.trim()
        ? body.feedback_note.trim()
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

  if (error && isMissingPhotoSessionColumn(error.message) && 'photo_session_id' in update) {
    const { photo_session_id: _omit, ...withoutPhotoSession } = update;
    void _omit;
    if (Object.keys(withoutPhotoSession).length === 0) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const retry = await supabase.from('weekly_best').update(withoutPhotoSession).eq('id', id).select('*').single();
    if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
    return NextResponse.json({ weeklyBest: retry.data }, { status: 200 });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ weeklyBest: data }, { status: 200 });
}

