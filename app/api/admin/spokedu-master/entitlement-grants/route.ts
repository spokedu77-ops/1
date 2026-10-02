import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { buildMasterAdminAccess, grantStatus } from '@/app/lib/server/spokeduMasterAdmin';
import { ensureSpokeduMasterEntitlement, evaluateSpokeduMasterEffectiveEntitlement, getActiveSpokeduMasterEntitlementGrant } from '@/app/lib/server/spokeduMasterAccess';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCES = new Set(['promo', 'partner', 'event', 'support', 'admin']);

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId')?.trim() ?? '';
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  const status = url.searchParams.get('status') ?? 'all';
  const plan = url.searchParams.get('plan') ?? 'all';
  const from = (page - 1) * 20;
  let query = getServiceSupabase()
    .from('spokedu_master_entitlement_grants')
    .select('id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at,granted_by,created_at,revoked_at,metadata', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (userId) {
    if (!UUID_PATTERN.test(userId)) return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    query = query.eq('user_id', userId);
  }
  if (plan === 'lite' || plan === 'premium') query = query.eq('plan', plan);
  if (status === 'revoked') query = query.not('revoked_at', 'is', null);
  if (status === 'active') query = query.is('revoked_at', null).lte('starts_at', new Date().toISOString()).gt('ends_at', new Date().toISOString());
  if (status === 'expired') query = query.is('revoked_at', null).lte('ends_at', new Date().toISOString());
  const { data, error, count } = await query.range(from, from + 19);
  if (error) return NextResponse.json({ error: 'Grant lookup failed' }, { status: 500 });
  const service = getServiceSupabase();
  const userIds = [...new Set((data ?? []).map((row) => row.user_id))];
  const [{ data: profiles }, { data: users }] = await Promise.all([
    userIds.length ? service.from('spokedu_master_profiles').select('user_id,name').in('user_id', userIds) : Promise.resolve({ data: [] }),
    userIds.length ? service.from('users').select('id,name,email').in('id', userIds) : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map((profiles ?? []).map((row: any) => [row.user_id, row]));
  const userMap = new Map((users ?? []).map((row: any) => [row.id, row]));
  return NextResponse.json({ grants: (data ?? []).map((row) => ({ ...row, status: grantStatus(row), memberName: profileMap.get(row.user_id)?.name || userMap.get(row.user_id)?.name || '이름 없음', email: userMap.get(row.user_id)?.email ?? null })), total: count ?? 0, page });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  const plan = body?.plan === 'lite' || body?.plan === 'premium' ? body.plan : null;
  const source = (typeof body?.source === 'string' && SOURCES.has(body.source) ? body.source : 'event') as 'promo' | 'partner' | 'event' | 'support' | 'admin';
  const durationDays = typeof body?.durationDays === 'number' && Number.isInteger(body.durationDays)
    ? body.durationDays
    : 30;
  const campaignId = typeof body?.campaignId === 'string' && body.campaignId.trim() ? body.campaignId.trim().slice(0, 120) : null;
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  const startsAtInput = typeof body?.startsAt === 'string' ? Date.parse(body.startsAt) : Number.NaN;
  const preview = body?.preview === true;
  if (!UUID_PATTERN.test(userId) || !plan || durationDays < 1 || durationDays > 366) {
    return NextResponse.json({ error: 'Invalid grant request' }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: '지급 사유는 필수입니다.' }, { status: 400 });
  const activatedAt = Number.isFinite(startsAtInput) ? new Date(startsAtInput) : new Date();
  const endsAt = new Date(activatedAt.getTime() + durationDays * 86_400_000);
  const service = getServiceSupabase();
  const [{ row: subscription, error: subError }, { row: currentGrant, error: grantError }] = await Promise.all([
    ensureSpokeduMasterEntitlement(service, userId),
    getActiveSpokeduMasterEntitlementGrant(service, userId),
  ]);
  if (subError || grantError) return NextResponse.json({ error: '현재 이용권 확인에 실패했습니다.' }, { status: 500 });
  const proposed = { id: 'preview', plan, source, campaign_id: campaignId, starts_at: activatedAt.toISOString(), activated_at: activatedAt.toISOString(), ends_at: endsAt.toISOString() } as const;
  const before = buildMasterAdminAccess({ subscription, grant: currentGrant });
  const afterDecision = evaluateSpokeduMasterEffectiveEntitlement(subscription, proposed);
  const warnings: string[] = [];
  if ((before.paidPlan === 'premium' || before.paidPlan === 'team') && plan === 'lite') warnings.push('현재 사용자는 이미 Premium 이용 중입니다. Lite 이용권을 지급해도 현재 이용 권한은 변경되지 않습니다.');
  if (currentGrant?.plan === plan) warnings.push(`현재 활성 ${plan === 'premium' ? 'Premium' : 'Lite'} 프로모션이 있습니다. 중복 지급될 수 있습니다.`);
  const previewResult = { before, afterPlan: afterDecision.allowed ? afterDecision.plan : 'free', fallbackPlan: before.fallbackPlan, startsAt: activatedAt.toISOString(), endsAt: endsAt.toISOString(), warnings };
  if (preview) return NextResponse.json({ preview: previewResult });
  const { data, error } = await service
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
      metadata: { duration_days: durationDays, reason },
    })
    .select('id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at,granted_by,created_at,revoked_at')
    .single();
  if (error) return NextResponse.json({ error: 'Grant creation failed' }, { status: 500 });
  return NextResponse.json({ grant: data, preview: previewResult }, { status: 201 });
}
