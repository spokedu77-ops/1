import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type LeadBody = {
  type?: unknown;
  name_or_org?: unknown;
  phone?: unknown;
  content_type?: unknown;
  target_age?: unknown;
  purpose?: unknown;
  teacher_training?: unknown;
  partnership_type?: unknown;
  extra?: unknown;
};

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as LeadBody | null;
    if (!body) {
      return NextResponse.json({ ok: false, message: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
    }

    const nameOrOrg = normalize(body.name_or_org);
    const rawType = normalize(body.type);
    if (rawType && rawType !== 'curriculum') {
      return NextResponse.json({ ok: false, message: '문의 유형(type)이 올바르지 않습니다.' }, { status: 400 });
    }
    const type = 'curriculum';
    const phone = normalize(body.phone);
    const contentType = normalize(body.content_type);
    const targetAge = normalize(body.target_age);
    const purpose = normalize(body.purpose);
    const teacherTraining = normalize(body.teacher_training);
    const partnershipType = normalize(body.partnership_type);
    const extra = normalize(body.extra);

    if (!nameOrOrg || !phone || !contentType || !targetAge || !purpose || !teacherTraining || !partnershipType) {
      return NextResponse.json({ ok: false, message: '필수 항목이 비어 있습니다.' }, { status: 400 });
    }

    const content = [
      '[커리큘럼·콘텐츠 문의]',
      `이름/기관명: ${nameOrOrg}`,
      `연락처: ${phone}`,
      `필요한 콘텐츠 유형: ${contentType}`,
      `대상 연령: ${targetAge}`,
      `활용 목적: ${purpose}`,
      `강사 교육 필요 여부: ${teacherTraining}`,
      `제휴/구매 형태: ${partnershipType}`,
      `문의 type: ${type}`,
      '',
      '[추가 문의]',
      extra || '-',
    ].join('\n');

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('consultations').insert({
      parent_name: nameOrOrg,
      phone,
      child_age: targetAge,
      content,
      consult_type: 'center',
      status: 'pending',
    });

    if (error) {
      console.error('[curriculum/leads] insert error', error);
      return NextResponse.json({ ok: false, message: 'DB 저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[curriculum/leads] unexpected', error);
    return NextResponse.json({ ok: false, message: '서버 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
