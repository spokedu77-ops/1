import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { requireTeacherMaterialsAccess } from '@/app/lib/server/teacherAuth';

const MAX_FAVORITES = 10;

function isValidPayload(p: unknown): boolean {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const obj = p as Record<string, unknown>;

  const isStringArray = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
  const isNumberArray = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'number');

  return (
    isStringArray(obj.selColors) &&
    isStringArray(obj.selArrows) &&
    isNumberArray(obj.selNums) &&
    typeof obj.stroop === 'boolean' &&
    (obj.trans === 'touch' || obj.trans === 'time') &&
    typeof obj.dispT === 'number' &&
    typeof obj.blankT === 'number' &&
    (obj.durMode === 'round' || obj.durMode === 'countdown') &&
    typeof obj.cdTime === 'number' &&
    typeof obj.rounds === 'number' &&
    typeof obj.sets === 'number'
  );
}

async function requireUserId(): Promise<{ userId: string } | { response: NextResponse }> {
  const auth = await requireTeacherMaterialsAccess();
  if (!auth.ok) return { response: auth.response };
  return { userId: auth.userId };
}

export async function GET(_req: NextRequest) {
  const auth = await requireUserId();
  if ('response' in auth) return auth.response;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spomove_favorites')
    .select('id, label, payload, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(MAX_FAVORITES);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if ('response' in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: '요청 본문이 필요합니다.' }, { status: 400 });
  }

  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : '';
  const payload = body.payload;

  if (!isValidPayload(payload)) {
    return NextResponse.json({ ok: false, error: '유효하지 않은 설정 데이터입니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { count, error: countErr } = await supabase
    .from('spomove_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId);

  if (countErr) {
    return NextResponse.json({ ok: false, error: countErr.message }, { status: 500 });
  }
  if ((count ?? 0) >= MAX_FAVORITES) {
    return NextResponse.json(
      { ok: false, error: 'limit_exceeded', message: `계정당 최대 ${MAX_FAVORITES}개까지 저장할 수 있습니다.` },
      { status: 429 }
    );
  }

  const { data, error: insertErr } = await supabase
    .from('spomove_favorites')
    .insert({ user_id: auth.userId, label: label || '이름 없음', payload })
    .select('id, label, payload, created_at')
    .single();

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}
