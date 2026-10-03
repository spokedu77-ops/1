import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { requireSpokeduMasterSession } from '@/app/lib/server/spokeduMasterAccess';
import { MASTER_FUNNEL_EVENT_NAMES, recordMasterFunnelEvent, type MasterFunnelEventName } from '@/app/lib/server/spokeduMasterFunnel';

const ALLOWED_NAMES = new Set<string>(MASTER_FUNNEL_EVENT_NAMES);
const ALLOWED_CONTEXT_KEYS = new Set(['surface', 'plan', 'program_id']);

function normalize(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = normalize(body?.name) as MasterFunnelEventName;
  if (!body || !ALLOWED_NAMES.has(name)) return NextResponse.json({ ok: false }, { status: 400 });

  let userId: string | null = null;
  if (name !== 'landing_visit') {
    const session = await requireSpokeduMasterSession();
    if (!session.ok) return session.response;
    userId = session.userId;
  }

  const context: Record<string, string> = {};
  for (const key of ALLOWED_CONTEXT_KEYS) {
    const value = normalize(body[key]);
    if (value) context[key] = value;
  }
  const result = await recordMasterFunnelEvent({ service: getServiceSupabase(), name, userId, context });
  if (!result.stored) return NextResponse.json({ ok: false, stored: false }, { status: 503 });
  return NextResponse.json({ ok: true, stored: true });
}
