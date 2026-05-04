import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const MESSAGE_MAX = 2000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 10;

const INTERESTED_PLANS = ['Library', 'All-in-One', 'SPOMOVE 단독', '아직 모르겠음'] as const;
const HAS_KIDS = ['운영 중', '준비 중', '운영 안 함'] as const;
const HAS_SCREEN = ['TV 있음', '빔프로젝터 있음', '태블릿/노트북만 있음', '아직 없음'] as const;

type InterestedPlan = (typeof INTERESTED_PLANS)[number];
type HasKidsClass = (typeof HAS_KIDS)[number];
type HasScreenEquipment = (typeof HAS_SCREEN)[number];

const rateBuckets = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(ip) ?? [];
  const recent = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  if (rateBuckets.size > 5000) {
    for (const [k, times] of rateBuckets) {
      const kept = times.filter((t) => now - t < RATE_WINDOW_MS);
      if (kept.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, kept);
    }
  }
  return false;
}

function trimStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function isNonEmpty(s: string): boolean {
  return s.length > 0;
}

/** 기본 이메일 형식 (로컬@도메인.최상위) */
function isValidEmail(s: string): boolean {
  if (s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const honeypot = trimStr(body.website, 200);
  if (honeypot.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 });
  }

  const dojoName = trimStr(body.dojoName, 200);
  const contactName = trimStr(body.contactName, 100);
  const phone = trimStr(body.phone, 40);
  const email = trimStr(body.email, 254);
  const region = trimStr(body.region, 100);
  const interestedPlan = trimStr(body.interestedPlan, 80) as InterestedPlan | string;
  const hasKidsClass = trimStr(body.hasKidsClass, 40) as HasKidsClass | string;
  const hasScreenEquipment = trimStr(body.hasScreenEquipment, 60) as HasScreenEquipment | string;
  const websiteUrl = trimStr(body.websiteUrl, 500);
  const message = trimStr(body.message, MESSAGE_MAX);
  const entryRaw = trimStr(body.entry, 20);

  if (!isNonEmpty(dojoName)) {
    return NextResponse.json({ ok: false, error: 'dojo_name_required' }, { status: 400 });
  }
  if (!isNonEmpty(contactName)) {
    return NextResponse.json({ ok: false, error: 'contact_name_required' }, { status: 400 });
  }
  if (!isNonEmpty(phone)) {
    return NextResponse.json({ ok: false, error: 'phone_required' }, { status: 400 });
  }
  if (!isNonEmpty(email)) {
    return NextResponse.json({ ok: false, error: 'email_required' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }
  if (!isNonEmpty(region)) {
    return NextResponse.json({ ok: false, error: 'region_required' }, { status: 400 });
  }
  if (!INTERESTED_PLANS.includes(interestedPlan as InterestedPlan)) {
    return NextResponse.json({ ok: false, error: 'invalid_interested_plan' }, { status: 400 });
  }
  if (!HAS_KIDS.includes(hasKidsClass as HasKidsClass)) {
    return NextResponse.json({ ok: false, error: 'invalid_has_kids_class' }, { status: 400 });
  }
  if (!HAS_SCREEN.includes(hasScreenEquipment as HasScreenEquipment)) {
    return NextResponse.json({ ok: false, error: 'invalid_has_screen_equipment' }, { status: 400 });
  }

  if (body.privacyConsent !== true) {
    return NextResponse.json({ ok: false, error: 'privacy_consent_required' }, { status: 400 });
  }

  const entry = entryRaw === 'inquiry' ? 'inquiry' : 'beta';
  const privacyConsentAt = new Date().toISOString();
  const meta: Record<string, unknown> = {
    entry,
    privacyConsent: true,
    privacyConsentAt,
  };

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('spokedu_pro_leads').insert({
    dojo_name: dojoName,
    contact_name: contactName,
    phone,
    email,
    region,
    interested_plan: interestedPlan,
    has_kids_class: hasKidsClass,
    has_screen_equipment: hasScreenEquipment,
    website_url: websiteUrl.length > 0 ? websiteUrl : null,
    message: message.length > 0 ? message : null,
    source: 'pro_landing',
    status: 'new',
    meta,
  });

  if (error) {
    console.error('[pro/leads] insert', error);
    return NextResponse.json({ ok: false, error: 'db_insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
