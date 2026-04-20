import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { compute } from '@/app/move-report/lib/compute';
import type { AgeGroup } from '@/app/move-report/types';

const RESPONSE_LEN = 12;
const VALID_AXIS = new Set(['C', 'I', 'R', 'E', 'P', 'G', 'D', 'S']);

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
    const body = (await req.json().catch(() => null)) as
      | {
          sessionId?: unknown;
          ageGroup?: unknown;
          profileKey?: unknown;
          profileTitle?: unknown;
          surveyResponses?: unknown;
        }
      | null;

    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    if (sessionId.length < 8) {
      return NextResponse.json({ ok: false, error: '세션 정보가 유효하지 않습니다.' }, { status: 400 });
    }

    const responses = parseSurveyResponses(body?.surveyResponses);
    if (!responses) {
      return NextResponse.json({ ok: false, error: '설문 응답이 올바르지 않습니다.' }, { status: 400 });
    }

    const age = body?.ageGroup === 'elementary' || body?.ageGroup === 'preschool' ? (body.ageGroup as AgeGroup) : null;
    if (!age) {
      return NextResponse.json({ ok: false, error: '연령 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const expected = compute(responses, age, '');
    const profileKey = typeof body?.profileKey === 'string' ? body.profileKey.trim() : '';
    const profileTitle = typeof body?.profileTitle === 'string' ? body.profileTitle.trim() : '';
    if (!profileKey || expected.key !== profileKey || expected.profile.char !== profileTitle) {
      return NextResponse.json({ ok: false, error: '결과 정보가 설문과 일치하지 않습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('move_report_submissions').insert({
      session_id: sessionId,
      age_group: age,
      profile_key: profileKey,
      profile_title: profileTitle,
      survey_responses: responses,
      source: 'move_report',
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
