import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { isCoachSlugBlocklisted, isValidCoachSlugFormat, normalizeCoachSlugInput } from '@/app/move-report/lib/coachSlug';

const MAX_LINKS_PER_CONTACT_PER_DAY = 5;
const MAX_LINKS_PER_IP_PER_DAY = 15;

function clientIp(req: NextRequest): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  const rip = req.headers.get('x-real-ip')?.trim();
  if (rip) return rip.slice(0, 80);
  return null;
}

function startOfUtcDayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

const MAX_ORG = 120;
const MAX_ROLE = 40;
const MAX_TARGET = 40;
const MAX_CONTACT = 200;

function trim(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          orgName?: unknown;
          role?: unknown;
          targetAudience?: unknown;
          slug?: unknown;
          contact?: unknown;
        }
      | null;

    const orgName = trim(body?.orgName, MAX_ORG);
    const role = trim(body?.role, MAX_ROLE);
    const targetAudience = trim(body?.targetAudience, MAX_TARGET);
    const contact = trim(body?.contact, MAX_CONTACT);
    const slug = normalizeCoachSlugInput(trim(body?.slug, 48));

    if (!orgName) {
      return NextResponse.json({ ok: false, error: '선생님/기관명을 입력해 주세요.' }, { status: 400 });
    }
    if (!role) {
      return NextResponse.json({ ok: false, error: '역할을 선택해 주세요.' }, { status: 400 });
    }
    if (!targetAudience) {
      return NextResponse.json({ ok: false, error: '주 수업 대상을 선택해 주세요.' }, { status: 400 });
    }
    if (!contact || contact.length < 3) {
      return NextResponse.json({ ok: false, error: '연락처 또는 이메일을 입력해 주세요.' }, { status: 400 });
    }
    if (!isValidCoachSlugFormat(slug)) {
      return NextResponse.json(
        { ok: false, error: '링크 주소는 3~40자, 영문 소문자·숫자·하이픈만 사용할 수 있어요. 예: rainbow-gym-2025' },
        { status: 400 },
      );
    }
    if (isCoachSlugBlocklisted(slug)) {
      return NextResponse.json({ ok: false, error: '사용할 수 없는 링크 주소예요. 다른 주소를 입력해 주세요.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const dayStart = startOfUtcDayIso();
    const ip = clientIp(req);

    const { count: contactDayCount, error: contactCntErr } = await supabase
      .from('move_report_coach_links')
      .select('id', { count: 'exact', head: true })
      .eq('contact', contact)
      .gte('created_at', dayStart);
    if (contactCntErr) {
      console.error('[move-report/coach-links] contact count', contactCntErr);
      return NextResponse.json({ ok: false, error: '요청을 처리하는 중 오류가 발생했어요.' }, { status: 500 });
    }
    if ((contactDayCount ?? 0) >= MAX_LINKS_PER_CONTACT_PER_DAY) {
      return NextResponse.json(
        { ok: false, error: '같은 연락처로 오늘 만든 링크가 너무 많아요. 내일 다시 시도하거나 다른 연락처를 사용해 주세요.' },
        { status: 429 },
      );
    }

    if (ip) {
      const { count: ipDayCount, error: ipCntErr } = await supabase
        .from('move_report_coach_links')
        .select('id', { count: 'exact', head: true })
        .eq('created_from_ip', ip)
        .gte('created_at', dayStart);
      if (ipCntErr) {
        console.error('[move-report/coach-links] ip count', ipCntErr);
        return NextResponse.json({ ok: false, error: '요청을 처리하는 중 오류가 발생했어요.' }, { status: 500 });
      }
      if ((ipDayCount ?? 0) >= MAX_LINKS_PER_IP_PER_DAY) {
        return NextResponse.json(
          { ok: false, error: '오늘 이 환경에서 만든 링크가 너무 많아요. 잠시 후 다시 시도해 주세요.' },
          { status: 429 },
        );
      }
    }

    const insertRow: Record<string, unknown> = {
      slug,
      org_name: orgName,
      role,
      target_audience: targetAudience,
      contact,
    };
    if (ip) insertRow.created_from_ip = ip;

    const { error } = await supabase.from('move_report_coach_links').insert(insertRow);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: '이미 사용 중인 링크 주소예요. 다른 주소를 골라 주세요.' }, { status: 409 });
      }
      console.error('[move-report/coach-links]', error);
      return NextResponse.json({ ok: false, error: '저장 중 오류가 발생했어요.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    console.error('[move-report/coach-links] unexpected', e);
    const message = e instanceof Error ? e.message : '';
    if (message.includes('Supabase service role env')) {
      return NextResponse.json({ ok: false, error: '서버 설정 오류입니다.' }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
