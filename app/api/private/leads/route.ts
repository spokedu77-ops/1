import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type LeadBody = {
  name?: unknown;
  phone?: unknown;
  content?: unknown;
};

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as LeadBody | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, message: '요청 본문이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const name = normalize(body.name);
    const phone = normalize(body.phone);
    const content = normalize(body.content);
    if (!name || !content) {
      return NextResponse.json(
        { ok: false, message: '필수 상담 항목이 비어 있습니다.' },
        { status: 400 }
      );
    }

    const tableName = process.env.PRIVATE_LEADS_TABLE?.trim() || 'consultations';
    const supabase = getServiceSupabase();
    const { error } = await supabase.from(tableName).insert({
      name,
      phone: phone || null,
      content,
    });

    if (error) {
      console.error('[private/leads] insert error', error);
      return NextResponse.json(
        { ok: false, message: 'DB 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[private/leads] unexpected', error);
    return NextResponse.json(
      { ok: false, message: '서버 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

