import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';

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
