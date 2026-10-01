import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';

export async function PATCH(_request: Request, context: { params: Promise<{ grantId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const { grantId } = await context.params;
  const { data, error } = await getServiceSupabase()
    .from('spokedu_master_entitlement_grants')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', grantId)
    .is('revoked_at', null)
    .select('id,revoked_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Grant revocation failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Active grant not found' }, { status: 404 });
  return NextResponse.json({ grant: data });
}
