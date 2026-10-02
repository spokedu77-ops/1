import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { buildMasterAdminAccess } from '@/app/lib/server/spokeduMasterAdmin';
import { ensureSpokeduMasterEntitlement, getActiveSpokeduMasterEntitlementGrant } from '@/app/lib/server/spokeduMasterAccess';

export async function PATCH(request: Request, context: { params: Promise<{ grantId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const { grantId } = await context.params;
  const body = await request.json().catch(() => null) as { preview?: boolean } | null;
  const service = getServiceSupabase();
  const { data: existing, error: existingError } = await service.from('spokedu_master_entitlement_grants').select('id,user_id,metadata,revoked_at').eq('id', grantId).maybeSingle();
  if (existingError) return NextResponse.json({ error: 'Grant lookup failed' }, { status: 500 });
  if (!existing || existing.revoked_at) return NextResponse.json({ error: 'Active grant not found' }, { status: 404 });
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
