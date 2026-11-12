import { NextResponse } from 'next/server';

import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { assertSpokeduMasterBillingProviderAccess, isSpokeduMasterBillingProviderConfigured } from '@/app/lib/server/spokeduMasterBillingProvider';
import { billingProviderDiagnostics } from '@/app/lib/server/spokeduMasterBillingDiagnostics';
import { reportError } from '@/app/lib/monitoring/errorReporter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const service = getServiceSupabase();
  const { data, error } = await service
    .from('spokedu_master_billing_provider_state')
    .select('status,checked_at,updated_at')
    .eq('singleton_key', true)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Provider health unavailable' }, { status: 500 });
  return NextResponse.json({
    status: data?.status ?? 'unknown',
    checkedAt: data?.checked_at ?? null,
    requiresAdminAction: data?.status === 'misconfigured',
  });
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let configured = isSpokeduMasterBillingProviderConfigured();
  let failureCode: string | undefined;
  if (configured) {
    try {
      await assertSpokeduMasterBillingProviderAccess();
    } catch (error) {
      configured = false;
      const diagnostics = billingProviderDiagnostics(error);
      failureCode = diagnostics.providerCode;
      await reportError(error, { context: 'spokedu_master.billing.health', tags: { stage: 'provider_access', ...diagnostics } });
    }
  }
  const checkedAt = new Date().toISOString();
  const service = getServiceSupabase();
  const { error } = await service
    .from('spokedu_master_billing_provider_state')
    .upsert({
      singleton_key: true,
      status: configured ? 'configured' : 'misconfigured',
      checked_at: checkedAt,
      updated_at: checkedAt,
    });

  if (error) {
    return NextResponse.json({ error: 'Provider health state update failed' }, { status: 500 });
  }

  return NextResponse.json(
    { ok: configured, requiresAdminAction: !configured, ...(failureCode ? { code: failureCode } : {}) },
    { status: configured ? 200 : 503 },
  );
}
