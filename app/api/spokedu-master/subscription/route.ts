import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson } from '@/app/lib/server/privateNoStore';
import {
  ensureSpokeduMasterEntitlement,
  evaluateSpokeduMasterEntitlement,
} from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function hasUnresolvedRenewalFailure(userId: string): Promise<boolean> {
  const service = getServiceSupabase();
  const { data: failed } = await service
    .from('spokedu_master_payment_orders')
    .select('updated_at')
    .eq('user_id', userId)
    .eq('status', 'failed')
    .eq('last_error_code', 'renewal_payment_failed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!failed?.updated_at) return false;

  const { data: succeeded } = await service
    .from('spokedu_master_payment_orders')
    .select('updated_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!succeeded?.updated_at) return true;
  return new Date(failed.updated_at).getTime() > new Date(succeeded.updated_at).getTime();
}

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

  const { row, error } = await ensureSpokeduMasterEntitlement(
    getServiceSupabase(),
    user.id,
  );
  if (error) {
    return privateNoStoreJson(
      { error: 'Subscription lookup failed' },
      { status: 500 },
    );
  }

  if (!row) {
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

  const canCancelAutoBilling =
    row.status === 'active' &&
    (row.plan === 'lite' || row.plan === 'premium' || row.plan === 'pro') &&
    row.cancel_at_period_end !== true &&
    Boolean(row.provider_billing_key_secret_id);

  const billingRenewalFailed = canCancelAutoBilling
    ? await hasUnresolvedRenewalFailure(user.id)
    : false;

  const common = {
    isAdmin: false,
    userId: user.id,
    email: user.email ?? null,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    periodEnd: row.period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    nextBillingAt: row.next_billing_at ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    canCancelAutoBilling,
    billingRenewalFailed,
  };

  const entitlement = evaluateSpokeduMasterEntitlement(row);

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
