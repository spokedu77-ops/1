import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCES = new Set(['promo', 'partner', 'event', 'support', 'admin']);

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const userId = new URL(request.url).searchParams.get('userId')?.trim() ?? '';
  if (!UUID_PATTERN.test(userId)) return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
  const { data, error } = await getServiceSupabase()
    .from('spokedu_master_entitlement_grants')
    .select('id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at,granted_by,created_at,revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Grant lookup failed' }, { status: 500 });
  return NextResponse.json({ grants: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  const plan = body?.plan === 'lite' || body?.plan === 'premium' ? body.plan : null;
  const source = typeof body?.source === 'string' && SOURCES.has(body.source) ? body.source : 'event';
  const durationDays = typeof body?.durationDays === 'number' && Number.isInteger(body.durationDays)
    ? body.durationDays
    : 30;
  const campaignId = typeof body?.campaignId === 'string' && body.campaignId.trim() ? body.campaignId.trim().slice(0, 120) : null;
  if (!UUID_PATTERN.test(userId) || !plan || durationDays < 1 || durationDays > 366) {
    return NextResponse.json({ error: 'Invalid grant request' }, { status: 400 });
  }
  const activatedAt = new Date();
  const endsAt = new Date(activatedAt.getTime() + durationDays * 86_400_000);
  const { data, error } = await getServiceSupabase()
    .from('spokedu_master_entitlement_grants')
    .insert({
      user_id: userId,
      plan,
      source,
      campaign_id: campaignId,
      starts_at: activatedAt.toISOString(),
      activated_at: activatedAt.toISOString(),
      ends_at: endsAt.toISOString(),
      granted_by: auth.userId,
      metadata: { duration_days: durationDays },
    })
    .select('id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at,granted_by,created_at,revoked_at')
    .single();
  if (error) return NextResponse.json({ error: 'Grant creation failed' }, { status: 500 });
  return NextResponse.json({ grant: data }, { status: 201 });
}
