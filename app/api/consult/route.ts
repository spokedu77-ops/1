import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type Body = {
  parent_name?: unknown;
  phone?: unknown;
  child_age?: unknown;
  content?: unknown;
  consult_type?: unknown;
};

function norm(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return NextResponse.json({ ok: false, message: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
    }

    const parent_name = norm(body.parent_name);
    const phone = norm(body.phone);
    const child_age = norm(body.child_age);
    const content = norm(body.content);
    const rawType = norm(body.consult_type);
    const consult_type = rawType === 'center' ? 'center' : 'tutoring';

    if (!parent_name || !content) {
      return NextResponse.json(
        { ok: false, message: '이름과 상담 내용은 필수입니다.' },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json({ ok: false, message: '연락처는 필수입니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('consultations')
      .insert({
        parent_name,
        phone: phone || null,
        child_age: child_age || null,
        content,
        consult_type,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[consult] insert', error);
      return NextResponse.json({ ok: false, message: '저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e) {
    console.error('[consult] unexpected', e);
    return NextResponse.json({ ok: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
