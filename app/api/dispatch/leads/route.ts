import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
    }

    const organization = typeof body.organization === 'string' ? body.organization.trim() : '';
    const manager = typeof body.manager === 'string' ? body.manager.trim() : '';
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    const startDate = typeof body.startDate === 'string' ? body.startDate.trim() : '';
    const endDate = typeof body.endDate === 'string' ? body.endDate.trim() : '';
    const headcount = typeof body.headcount === 'string' ? body.headcount.trim() : '';
    const specialNeeds = typeof body.specialNeeds === 'string' ? body.specialNeeds.trim() : '';
    const inquiry = typeof body.inquiry === 'string' ? body.inquiry.trim() : '';
    const source = typeof body.source === 'string' ? body.source.trim() : 'dispatch-page';
    const programs = Array.isArray(body.programs) ? body.programs.filter((v): v is string => typeof v === 'string') : [];
    const targetAge = Array.isArray(body.targetAge) ? body.targetAge.filter((v): v is string => typeof v === 'string') : [];

    if (!organization || !manager) {
      return NextResponse.json({ ok: false, error: '기관명과 담당자 정보는 필수입니다.' }, { status: 400 });
    }

    const phone = normalizePhone(phoneRaw);
    const email = emailRaw.toLowerCase();
    if (!phone && !email) {
      return NextResponse.json({ ok: false, error: '연락처(번호 또는 메일) 중 하나는 필수입니다.' }, { status: 400 });
    }
    if (phone && (phone.length < 10 || phone.length > 11)) {
      return NextResponse.json({ ok: false, error: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: '이메일 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('dispatch_leads').insert({
      organization_name: organization,
      manager_name: manager,
      phone: phone || null,
      email: email || null,
      location: location || null,
      start_date: startDate || null,
      end_date: endDate || null,
      programs,
      target_ages: targetAge,
      headcount: headcount || null,
      special_needs: specialNeeds || null,
      inquiry: inquiry || null,
      source,
    });

    if (error) {
      console.error('[dispatch/leads]', error);
      return NextResponse.json({ ok: false, error: '접수 저장 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[dispatch/leads] unexpected', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

