import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getGymBypassKeyValue, gymBypassKeysMatch } from '@/app/lib/server/moveReportGymKey';

const MAX_COMPLETIONS = 3;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: unknown;
      gymKey?: unknown;
    };
    const action = body.action === 'check' || body.action === 'record' ? body.action : null;
    if (!action) {
      return NextResponse.json({ ok: false, error: 'action이 필요합니다.' }, { status: 400 });
    }

    const providedGym = typeof body.gymKey === 'string' ? body.gymKey.trim() : '';
    let bypass = false;
    if (providedGym) {
      const stored = await getGymBypassKeyValue();
      bypass = gymBypassKeysMatch(stored, providedGym);
    }

    if (bypass) {
      if (action === 'check') {
        return NextResponse.json({ ok: true, allowed: true, bypass: true });
      }
      return NextResponse.json({ ok: true, bypass: true });
    }

    const ip = getClientIp(req);
    if (ip === 'unknown') {
      if (action === 'check') {
        return NextResponse.json({ ok: true, allowed: true, skipIp: true });
      }
      return NextResponse.json({ ok: true, skipIp: true });
    }

    const supabase = getServiceSupabase();

    if (action === 'check') {
      const { data: row, error } = await supabase.from('move_report_ip_limits').select('count').eq('ip', ip).maybeSingle();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      const count = typeof row?.count === 'number' ? row.count : 0;
      const allowed = count < MAX_COMPLETIONS;
      return NextResponse.json({ ok: true, allowed, count });
    }

    const { data: row, error: selErr } = await supabase.from('move_report_ip_limits').select('count').eq('ip', ip).maybeSingle();
    if (selErr) {
      return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
    }
    const current = typeof row?.count === 'number' ? row.count : 0;
    if (current >= MAX_COMPLETIONS) {
      return NextResponse.json({ ok: false, error: 'limit_exceeded', count: current }, { status: 429 });
    }
    const next = current + 1;
    const { error: upErr } = await supabase
      .from('move_report_ip_limits')
      .upsert(
        { ip, count: next, updated_at: new Date().toISOString() },
        { onConflict: 'ip' }
      );
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
