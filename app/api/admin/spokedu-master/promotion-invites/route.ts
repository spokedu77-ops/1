import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  const from = (page - 1) * 20;
  const { data, error, count } = await getServiceSupabase()
    .from('spokedu_master_promotion_invites')
    .select('id,email,campaign_id,plan,duration_days,expires_at,redeemed_by,redeemed_at,created_by,created_at,revoked_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + 19);
  if (error) return NextResponse.json({ error: 'Invite lookup failed' }, { status: 500 });
  const now = Date.now();
  return NextResponse.json({ invites: (data ?? []).map((row) => ({
    ...row,
    status: row.revoked_at ? 'revoked' : row.redeemed_at ? 'redeemed' : Date.parse(row.expires_at) <= now ? 'expired' : 'issued',
  })), total: count ?? 0, page });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const plan = body?.plan === 'lite' || body?.plan === 'premium' ? body.plan : null;
  const durationDays = typeof body?.durationDays === 'number' && Number.isInteger(body.durationDays) ? body.durationDays : 30;
  const expiresInDays = typeof body?.expiresInDays === 'number' && Number.isInteger(body.expiresInDays) ? body.expiresInDays : 30;
  const email = typeof body?.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null;
  const campaignId = typeof body?.campaignId === 'string' && body.campaignId.trim() ? body.campaignId.trim().slice(0, 120) : null;
  if (!plan || durationDays < 1 || durationDays > 366 || expiresInDays < 1 || expiresInDays > 366) {
    return NextResponse.json({ error: 'Invalid invite request' }, { status: 400 });
  }
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
  const { data, error } = await getServiceSupabase()
    .from('spokedu_master_promotion_invites')
    .insert({ email, token_hash: tokenHash, campaign_id: campaignId, plan, duration_days: durationDays, expires_at: expiresAt, created_by: auth.userId })
    .select('id,email,campaign_id,plan,duration_days,expires_at,created_at')
    .single();
  if (error) return NextResponse.json({ error: 'Invite creation failed' }, { status: 500 });
  return NextResponse.json({ invite: data, token }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const body = await request.json().catch(() => null) as { inviteId?: unknown } | null;
  const inviteId = typeof body?.inviteId === 'string' ? body.inviteId : '';
  if (!inviteId) return NextResponse.json({ error: 'inviteId is required' }, { status: 400 });
  const { data, error } = await getServiceSupabase().from('spokedu_master_promotion_invites')
    .update({ revoked_at: new Date().toISOString() }).eq('id', inviteId).is('revoked_at', null).is('redeemed_at', null).select('id,revoked_at').maybeSingle();
  if (error) return NextResponse.json({ error: 'Invite revocation failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Active invite not found' }, { status: 404 });
  return NextResponse.json({ invite: data });
}
