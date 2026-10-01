import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson } from '@/app/lib/server/privateNoStore';
import {
  ensureSpokeduMasterEntitlement,
  evaluateSpokeduMasterEffectiveEntitlement,
  getActiveSpokeduMasterEntitlementGrant,
} from '@/app/lib/server/spokeduMasterAccess';
import { hasSpokeduMasterBillingRenewalFailure } from '@/app/lib/server/spokeduMasterRenewalState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateNoStoreJson({
      plan: 'free',
      status: 'none',
      isAdmin: false,
      canCancelAutoBilling: false,
      billingRenewalFailed: false,
    });
  }

  if (await isPlatformAdminUser(user, supabase)) {
    return privateNoStoreJson({
      plan: 'team',
      status: 'active',
      isAdmin: true,
      userId: user.id,
      email: user.email ?? null,
      trialStartedAt: null,
      trialEndsAt: null,
      periodEnd: null,
      canCancelAutoBilling: false,
      billingRenewalFailed: false,
    });
  }

  const service = getServiceSupabase();
  const [{ row, error }, { row: grant, error: grantError }] = await Promise.all([
    ensureSpokeduMasterEntitlement(service, user.id),
    getActiveSpokeduMasterEntitlementGrant(service, user.id),
  ]);
  if (error || grantError) {
    return privateNoStoreJson(
      { error: 'Subscription lookup failed' },
      { status: 500 },
    );
  }

  if (!row && !grant) {
    return privateNoStoreJson({
      plan: 'free',
      status: 'none',
      isAdmin: false,
      userId: user.id,
      email: user.email ?? null,
      trialStartedAt: null,
      trialEndsAt: null,
      periodEnd: null,
      canCancelAutoBilling: false,
      billingRenewalFailed: false,
    });
  }

  const entitlement = evaluateSpokeduMasterEffectiveEntitlement(row, grant);
  const promotionActive = entitlement.source === 'promotion';
  const canCancelAutoBilling = Boolean(
    !promotionActive &&
    row?.status === 'active' &&
    (row.plan === 'lite' || row.plan === 'premium' || row.plan === 'pro') &&
    row.cancel_at_period_end !== true &&
    row.provider_billing_key_secret_id,
  );

  const billingRenewalFailed = hasSpokeduMasterBillingRenewalFailure(row, promotionActive);

  const common = {
    isAdmin: false,
    userId: user.id,
    email: user.email ?? null,
    trialStartedAt: row?.trial_started_at ?? null,
    trialEndsAt: row?.trial_ends_at ?? null,
    periodEnd: row?.period_end ?? null,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    nextBillingAt: promotionActive ? null : row?.next_billing_at ?? null,
    currentPeriodEnd: promotionActive ? grant?.ends_at ?? null : row?.current_period_end ?? null,
    canCancelAutoBilling,
    billingRenewalFailed,
    renewalRetryCount: row?.renewal_retry_count ?? 0,
    lastBillingError: row?.last_billing_error ?? null,
    nextRetryAt: row?.next_retry_at ?? null,
    entitlementSource: entitlement.source,
    promotionalPlan: grant?.plan ?? null,
    promotionalEndsAt: grant?.ends_at ?? null,
    campaignId: grant?.campaign_id ?? null,
  };

  if (entitlement.allowed && entitlement.status === 'active') {
    return privateNoStoreJson({
      ...common,
      plan: entitlement.plan,
      status: 'active',
    });
  }

  if (entitlement.plan === 'lite' || entitlement.plan === 'premium' || entitlement.plan === 'team') {
    return privateNoStoreJson({
      ...common,
      plan: entitlement.plan,
      status: entitlement.status,
      trialEndsAt: null,
      billingRenewalFailed: false,
    });
  }

  return privateNoStoreJson({
    ...common,
    plan: 'free',
    status: entitlement.status,
    billingRenewalFailed: false,
  });
}
