import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

function normalizePhone(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('8210') && digits.length >= 12) {
    const n = `010${digits.slice(4)}`;
    return /^010\d{8}$/.test(n) ? n : null;
  }
  if (/^010\d{8}$/.test(digits)) return digits;
  if (digits.length >= 10) return digits;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { phone, childName, ageGroup, profileKey, profileTitle, consent } = body;

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({ ok: false, error: '전화번호가 유효하지 않습니다.' }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ ok: false, error: '개인정보 동의가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('move_report_leads').upsert(
      {
        phone: normalized,
        child_name: childName?.trim() || null,
        age_group: ageGroup || null,
        profile_key: profileKey || null,
        profile_title: profileTitle || null,
        consent: true,
      },
      { onConflict: 'phone,profile_key', ignoreDuplicates: false }
    );

    if (error) {
      console.error('[move-report/leads]', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[move-report/leads] unexpected', e);
    const message = e instanceof Error ? e.message : '';
    if (message.includes('Supabase service role env')) {
      return NextResponse.json({ ok: false, error: '서버 설정 오류입니다.' }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
