import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const ALLOWED_NAMES = new Set([
  'selection_changed',
  'evidence_opened',
  'primary_cta_clicked',
  'form_submitted',
  'form_started',
]);

const ALLOWED_ROUTES = new Set(['private', 'curriculum', 'dispatch', 'other']);

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** PII 없는 퍼널 이벤트 sink */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const name = normalize(body.name);
    const route = normalize(body.route);
    if (!ALLOWED_NAMES.has(name) || !ALLOWED_ROUTES.has(route)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // strip anything that looks like PII keys
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === 'name' || key === 'route') continue;
      if (/name|phone|email|org|parent|content|message/i.test(key)) continue;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        payload[key] = value;
      }
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('commercial_funnel_events').insert({
      name,
      route,
      payload,
    });

    if (error) {
      // 테이블 미적용 환경에서도 폼/CTA를 막지 않음
      console.warn('[commercial-events] insert skipped', error.message);
      return NextResponse.json({ ok: true, stored: false });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.warn('[commercial-events] unexpected', error);
    return NextResponse.json({ ok: true, stored: false });
  }
}
