import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { buildMasterAdminAccess, calculateGrantExtensionEnd } from '@/app/lib/server/spokeduMasterAdmin';
import { ensureSpokeduMasterEntitlement, getActiveSpokeduMasterEntitlementGrant } from '@/app/lib/server/spokeduMasterAccess';

export async function PATCH(request: Request, context: { params: Promise<{ grantId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const { grantId } = await context.params;
  const body = await request.json().catch(() => null) as { action?: 'extend'; days?: number; reason?: string; preview?: boolean } | null;
  const service = getServiceSupabase();
  const { data: existing, error: existingError } = await service.from('spokedu_master_entitlement_grants').select('id,user_id,plan,source,campaign_id,starts_at,ends_at,metadata,revoked_at').eq('id', grantId).maybeSingle();
  if (existingError) return NextResponse.json({ error: 'Grant lookup failed' }, { status: 500 });
  if (!existing || existing.revoked_at) return NextResponse.json({ error: 'Active grant not found' }, { status: 404 });

  if (body?.action === 'extend') {
    const now = new Date();
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
    const nextEndsAt = calculateGrantExtensionEnd(existing.ends_at, body.days ?? Number.NaN);
    if (!nextEndsAt || !reason) return NextResponse.json({ error: '연장 일수와 사유를 확인해 주세요.' }, { status: 400 });
    if (Date.parse(existing.starts_at) > now.getTime() || Date.parse(existing.ends_at) <= now.getTime()) {
      return NextResponse.json({ error: '현재 이용 중인 이용권만 연장할 수 있습니다.' }, { status: 409 });
    }
    const metadata = existing.metadata && typeof existing.metadata === 'object' ? existing.metadata as Record<string, unknown> : {};
    const history = Array.isArray(metadata.extension_history) ? metadata.extension_history : [];
    const extension = {
      old_ends_at: existing.ends_at,
      new_ends_at: nextEndsAt,
      days: body.days,
      reason,
      extended_by: auth.userId,
      extended_at: now.toISOString(),
    };
    const { data: updated, error: updateError } = await service
      .from('spokedu_master_entitlement_grants')
      .update({ ends_at: nextEndsAt, metadata: { ...metadata, extension_history: [...history, extension] } })
      .eq('id', grantId)
      .eq('ends_at', existing.ends_at)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();
    if (updateError) return NextResponse.json({ error: '이용권 기간 연장에 실패했습니다.' }, { status: 500 });
    if (!updated) return NextResponse.json({ error: '이용권이 이미 변경되었습니다. 새로고침 후 다시 시도해 주세요.' }, { status: 409 });
    const { data: verified, error: verifyError } = await service
      .from('spokedu_master_entitlement_grants')
      .select('id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at,granted_by,created_at,revoked_at,metadata')
      .eq('id', grantId)
      .single();
    if (verifyError || verified.ends_at !== nextEndsAt) return NextResponse.json({ error: '연장 결과를 확인하지 못했습니다.' }, { status: 500 });
    return NextResponse.json({ grant: verified, extension });
  }

  const [{ row: subscription }, { row: activeGrant }] = await Promise.all([ensureSpokeduMasterEntitlement(service, existing.user_id), getActiveSpokeduMasterEntitlementGrant(service, existing.user_id)]);
  const before = buildMasterAdminAccess({ subscription, grant: activeGrant });
  const preview = { before, afterPlan: before.fallbackPlan };
  if (body?.preview) return NextResponse.json({ preview });
  const { data, error } = await service
    .from('spokedu_master_entitlement_grants')
    .update({ revoked_at: new Date().toISOString(), metadata: { ...(existing.metadata ?? {}), revoked_by: auth.userId } })
    .eq('id', grantId)
    .is('revoked_at', null)
    .select('id,revoked_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Grant revocation failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Active grant not found' }, { status: 404 });
  return NextResponse.json({ grant: data, preview });
}
