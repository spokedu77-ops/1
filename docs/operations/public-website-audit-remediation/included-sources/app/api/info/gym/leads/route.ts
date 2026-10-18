import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  evaluatePublicLeadRateLimit,
  getTrustedClientIp,
  isHoneypotTripped,
  rateLimitToResponse,
} from '@/app/lib/server/publicLeadSpamGuard';

type Body = {
  name?: unknown;
  phone?: unknown;
  age?: unknown;
  pref?: unknown;
  freq?: unknown;
  msg?: unknown;
  consent?: unknown;
  center?: unknown;
  website?: unknown;
};

function norm(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

async function syncGoogleSheet(payload: Record<string, unknown>): Promise<{ ok: boolean; skipped?: boolean }> {
  const url =
    process.env.GYM_LEADS_GOOGLE_SCRIPT_URL?.trim() ||
    process.env.INFO_GYM_LEADS_GOOGLE_SCRIPT_URL?.trim();
  if (!url) return { ok: false, skipped: true };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error('[gym/leads] sheet sync failed', e instanceof Error ? e.message : 'unknown');
    return { ok: false };
  }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: 'invalid_json' }, { status: 400 });
  }

  if (isHoneypotTripped(body as Record<string, unknown>)) {
    return NextResponse.json({ ok: true });
  }

  const rate = await evaluatePublicLeadRateLimit(req, 'gym-leads');
  const rateRes = rateLimitToResponse(rate);
  if (rateRes) return rateRes;

  const name = norm(body.name);
  const phone = normalizePhone(norm(body.phone));
  const age = norm(body.age);
  const pref = norm(body.pref);
  const freq = norm(body.freq);
  const msg = norm(body.msg);
  const center = norm(body.center) || 'SPOKEDU LAB 강동';

  if (!name || phone.length < 10 || !age) {
    return NextResponse.json({ ok: false, message: 'required_fields_missing' }, { status: 400 });
  }
  if (body.consent !== true && body.consent !== 'on') {
    return NextResponse.json({ ok: false, message: 'consent_required' }, { status: 400 });
  }

  const content = [
    '[강동 체육관 체험 신청]',
    `센터: ${center}`,
    `자녀 연령: ${age}`,
    pref ? `희망: ${pref}` : null,
    freq ? `빈도: ${freq}` : null,
    msg ? `메모: ${msg}` : null,
    `source: /info/gym`,
    `ip: ${getTrustedClientIp(req)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: recentDup } = await supabase
    .from('consultations')
    .select('id')
    .eq('phone', phone)
    .eq('lead_route', 'info_gym')
    .gte('created_at', since)
    .limit(1)
    .maybeSingle();
  if (recentDup?.id) {
    return NextResponse.json({ ok: true, id: recentDup.id, deduped: true });
  }

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      parent_name: name,
      phone,
      child_age: age,
      content,
      consult_type: 'center',
      status: 'pending',
      lead_route: 'info_gym',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[gym/leads] insert', error.code);
    return NextResponse.json({ ok: false, message: 'db_save_failed' }, { status: 500 });
  }

  const sheetPayload = {
    name,
    phone,
    age,
    pref,
    freq,
    msg,
    center,
    createdAt: new Date().toISOString(),
    consultId: data?.id ?? null,
  };
  await syncGoogleSheet(sheetPayload);

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
