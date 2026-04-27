import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type NoticePayload = {
  title?: string;
  content?: string;
  category?: string;
  is_pinned?: boolean;
  image_urls?: string[] | null;
  inline_images?: unknown[] | null;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as NoticePayload | null;
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'title이 필요합니다.' }, { status: 400 });
  }
  if (typeof body.content !== 'string' || !body.content.trim()) {
    return NextResponse.json({ error: 'content가 필요합니다.' }, { status: 400 });
  }
  const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'general';

  const supabase = getServiceSupabase();
  const payload = {
    title: body.title.trim(),
    content: body.content,
    category,
    is_pinned: !!body.is_pinned,
    author: '운영진',
    created_at: new Date().toISOString(),
    image_urls: body.image_urls ?? null,
    inline_images: body.inline_images ?? null,
  };

  const { data, error } = await supabase
    .from('notices')
    .insert([payload])
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notice: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as (NoticePayload & { id?: number }) | null;
  const id = typeof body?.id === 'number' ? body.id : NaN;
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body?.title === 'string') update.title = body.title;
  if (typeof body?.content === 'string') update.content = body.content;
  if (typeof body?.category === 'string') update.category = body.category;
  if (typeof body?.is_pinned === 'boolean') update.is_pinned = body.is_pinned;
  if ('image_urls' in (body ?? {})) update.image_urls = body?.image_urls ?? null;
  if ('inline_images' in (body ?? {})) update.inline_images = body?.inline_images ?? null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('notices')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notice: data }, { status: 200 });
}
