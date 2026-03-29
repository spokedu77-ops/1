import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { compute } from '@/app/move-report/lib/compute';
import type { AgeGroup } from '@/app/move-report/types';

const RESPONSE_LEN = 12;
const VALID_AXIS = new Set(['C', 'I', 'R', 'E', 'P', 'G', 'D', 'S']);

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

function parseSurveyResponses(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length !== RESPONSE_LEN) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || item.length !== 1 || !VALID_AXIS.has(item)) return null;
    out.push(item);
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { phone, childName, ageGroup, profileKey, profileTitle, consent, surveyResponses } = body;

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({ ok: false, error: '전화번호가 유효하지 않습니다.' }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ ok: false, error: '개인정보 동의가 필요합니다.' }, { status: 400 });
    }

    const responses = parseSurveyResponses(surveyResponses);
    if (!responses) {
      return NextResponse.json({ ok: false, error: '설문 응답이 올바르지 않습니다.' }, { status: 400 });
    }
    const age = ageGroup === 'elementary' || ageGroup === 'preschool' ? (ageGroup as AgeGroup) : null;
    if (!age) {
      return NextResponse.json({ ok: false, error: '연령 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const nameForCompute = typeof childName === 'string' ? childName : '';
    const expected = compute(responses, age, nameForCompute);
    const pk = typeof profileKey === 'string' ? profileKey.trim() : '';
    const pt = typeof profileTitle === 'string' ? profileTitle.trim() : '';
    if (!pk || expected.key !== pk || expected.profile.char !== pt) {
      return NextResponse.json({ ok: false, error: '결과 정보가 설문과 일치하지 않습니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('move_report_leads').upsert(
      {
        phone: normalized,
        child_name: childName?.trim() || null,
        age_group: ageGroup || null,
        profile_key: pk,
        profile_title: pt,
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
