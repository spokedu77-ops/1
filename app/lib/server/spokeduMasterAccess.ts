import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { reportError } from '@/app/lib/monitoring/errorReporter';

const EXPIRED_ACCESS_MESSAGE =
  '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다. 이용권을 다시 선택해 주세요.';

type MasterPlan = 'lite' | 'premium' | 'team' | 'admin';

type MasterAccessOk = {
  ok: true;
  userId: string;
  isAdmin: boolean;
  plan: MasterPlan;
};

type MasterAccessFail = {
  ok: false;
  response: NextResponse;
};

export type MasterAccessResult = MasterAccessOk | MasterAccessFail;

export type MasterSessionResult =
  | { ok: true; userId: string; isAdmin: boolean }
  | MasterAccessFail;

export type SpokeduMasterAccessSnapshot = {
  authenticated: true;
  onboardingDone: boolean;
  plan: 'free' | 'lite' | 'premium' | 'team';
  subscriptionStatus: 'none' | 'active' | 'expired' | 'cancelled';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isAdmin: boolean;
  isCenterOrTeam: boolean;
  canUseLibrary: boolean;
  canUseClassTools: boolean;
  canUseRecords: boolean;
  canUseSpomove: boolean;
};

export type MasterAccessSnapshotResult =
  | { ok: true; userId: string; snapshot: SpokeduMasterAccessSnapshot }
  | MasterAccessFail;

export type SpokeduMasterSubscriptionRow = {
  plan: string | null;
  status: string | null;
  period_end: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  cancel_at_period_end?: boolean | null;
  next_billing_at?: string | null;
  current_period_end?: string | null;
  provider_billing_key_secret_id?: string | null;
};

export function normalizeSpokeduMasterPlan(plan: string | null | undefined): 'free' | 'lite' | 'premium' | 'team' {
  if (plan === 'lite' || plan === 'team') return plan;
  if (plan === 'premium' || plan === 'pro') return 'premium';
  return 'free';
}

export function isSpokeduMasterTrialActive(
  row: SpokeduMasterSubscriptionRow | null,
  now = Date.now(),
): boolean {
  if (!row?.trial_ends_at) return false;
  const trialEndMs = Date.parse(row.trial_ends_at);
  return Number.isFinite(trialEndMs) && trialEndMs > now;
}

export function isSpokeduMasterPaidPlanActive(
  row: SpokeduMasterSubscriptionRow | null,
  now = Date.now(),
): row is SpokeduMasterSubscriptionRow & { plan: 'lite' | 'premium' | 'pro' | 'team' } {
  if (!row) return false;
  if (row.status !== 'active') return false;
  if (normalizeSpokeduMasterPlan(row.plan) === 'free') return false;
  if (!row.period_end) return false;
  const periodEndMs = Date.parse(row.period_end);
  return Number.isFinite(periodEndMs) && periodEndMs > now;
}

export function isSpokeduMasterPaidPlanExpired(row: SpokeduMasterSubscriptionRow | null, now = Date.now()): boolean {
  if (!row) return false;
  if (normalizeSpokeduMasterPlan(row.plan) === 'free') return false;
  if (row.status === 'cancelled' || row.status === 'expired') return true;
  if (row.status !== 'active') return false;
  if (!row.period_end) return true;
  const periodEndMs = Date.parse(row.period_end);
  return !Number.isFinite(periodEndMs) || periodEndMs <= now;
}

export type SpokeduMasterEntitlementDecision =
  | { allowed: true; plan: 'lite' | 'premium' | 'team'; status: 'active' }
  | { allowed: false; plan: 'free' | 'lite' | 'premium' | 'team'; status: 'expired' | 'cancelled' | 'none' };

export function evaluateSpokeduMasterEntitlement(
  row: SpokeduMasterSubscriptionRow | null,
  now = Date.now(),
): SpokeduMasterEntitlementDecision {
  if (isSpokeduMasterPaidPlanActive(row, now)) {
    return { allowed: true, plan: normalizeSpokeduMasterPlan(row.plan) as 'lite' | 'premium' | 'team', status: 'active' };
  }

  const normalizedPlan = normalizeSpokeduMasterPlan(row?.plan);
  if (normalizedPlan !== 'free') {
    return {
      allowed: false,
      plan: normalizedPlan,
      status: row?.status === 'cancelled' ? 'cancelled' : 'expired',
    };
  }

  return { allowed: false, plan: 'free', status: 'expired' };
}

function buildCapabilities(plan: SpokeduMasterAccessSnapshot['plan'], status: SpokeduMasterAccessSnapshot['subscriptionStatus'], isAdmin: boolean) {
  if (isAdmin || (plan === 'team' && status === 'active')) {
    return {
      canUseLibrary: true,
      canUseClassTools: true,
      canUseRecords: true,
      canUseSpomove: true,
    };
  }

  if (status !== 'active') {
    return {
      canUseLibrary: false,
      canUseClassTools: false,
      canUseRecords: false,
      canUseSpomove: false,
    };
  }

  if (plan === 'lite') {
    return {
      canUseLibrary: true,
      canUseClassTools: true,
      canUseRecords: true,
      canUseSpomove: false,
    };
  }

  if (plan === 'premium') {
    return {
      canUseLibrary: true,
      canUseClassTools: true,
      canUseRecords: true,
      canUseSpomove: true,
    };
  }

  return {
    canUseLibrary: false,
    canUseClassTools: false,
    canUseRecords: false,
    canUseSpomove: false,
  };
}

export function buildSpokeduMasterAccessSnapshot(input: {
  row: SpokeduMasterSubscriptionRow | null;
  isAdmin: boolean;
  onboardingDone?: boolean;
}): SpokeduMasterAccessSnapshot {
  if (input.isAdmin) {
    return {
      authenticated: true,
      onboardingDone: input.onboardingDone ?? true,
      plan: 'team',
      subscriptionStatus: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isAdmin: true,
      isCenterOrTeam: true,
      ...buildCapabilities('team', 'active', true),
    };
  }

  const entitlement = evaluateSpokeduMasterEntitlement(input.row);
  const plan = entitlement.plan === 'lite' || entitlement.plan === 'premium' || entitlement.plan === 'team'
    ? entitlement.plan
    : 'free';
  const subscriptionStatus = input.row
    ? entitlement.status
    : 'none';
  const currentPeriodEnd = input.row?.current_period_end ?? input.row?.period_end ?? null;

  return {
    authenticated: true,
    onboardingDone: input.onboardingDone ?? false,
    plan,
    subscriptionStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd: input.row?.cancel_at_period_end ?? false,
    isAdmin: false,
    isCenterOrTeam: plan === 'team',
    ...buildCapabilities(plan, subscriptionStatus, false),
  };
}

type ServiceSupabase = ReturnType<typeof getServiceSupabase>;

export async function ensureSpokeduMasterEntitlement(
  serviceSupabase: ServiceSupabase,
  userId: string,
): Promise<{ row: SpokeduMasterSubscriptionRow | null; error: unknown | null }> {
  const selectRow = async () => serviceSupabase
    .from('spokedu_master_subscriptions')
    .select('plan,status,period_end,cancel_at_period_end,next_billing_at,current_period_end,provider_billing_key_secret_id')
    .eq('user_id', userId)
    .maybeSingle();

  const existing = await selectRow();
  if (existing.error) return { row: null, error: existing.error };
  if (existing.data) {
    return { row: existing.data as SpokeduMasterSubscriptionRow, error: null };
  }

  return { row: null, error: null };
}

export async function requireSpokeduMasterAccess(): Promise<MasterAccessResult> {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    const isAdmin = await isPlatformAdminUser(user, serverSupabase);
    if (isAdmin) {
      return { ok: true, userId: user.id, isAdmin: true, plan: 'admin' };
    }

    const serviceSupabase = getServiceSupabase();
    const { row: subscription, error } = await ensureSpokeduMasterEntitlement(
      serviceSupabase,
      user.id,
    );

    if (error) {
      devLogger.error('[requireSpokeduMasterAccess] subscription lookup failed', error);
      await reportError(error, {
        context: 'spokedu_master.access',
        tags: {
          stage: 'subscription_lookup',
          status: 500,
        },
      });
      return {
        ok: false,
        response: NextResponse.json({ error: 'Subscription lookup failed' }, { status: 500 }),
      };
    }

    const entitlement = evaluateSpokeduMasterEntitlement(subscription);

    if (entitlement.allowed && entitlement.status === 'active') {
      return {
        ok: true,
        userId: user.id,
        isAdmin: false,
        plan: entitlement.plan,
      };
    }

    if (entitlement.plan === 'lite' || entitlement.plan === 'premium' || entitlement.plan === 'team') {
      return {
        ok: false,
        response: NextResponse.json({ error: EXPIRED_ACCESS_MESSAGE }, { status: 403 }),
      };
    }

    return {
      ok: false,
      response: NextResponse.json({ error: EXPIRED_ACCESS_MESSAGE }, { status: 403 }),
    };
  } catch (err) {
    devLogger.error('[requireSpokeduMasterAccess]', err);
    await reportError(err, {
      context: 'spokedu_master.access',
      tags: {
        stage: 'unexpected',
        status: 500,
      },
    });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server error' }, { status: 500 }),
    };
  }
}

export async function requireSpokeduMasterSession(): Promise<MasterSessionResult> {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    return {
      ok: true,
      userId: user.id,
      isAdmin: await isPlatformAdminUser(user, serverSupabase),
    };
  } catch (err) {
    devLogger.error('[requireSpokeduMasterSession]', err);
    await reportError(err, {
      context: 'spokedu_master.session',
      tags: {
        stage: 'unexpected',
        status: 500,
      },
    });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server error' }, { status: 500 }),
    };
  }
}

export async function getSpokeduMasterAccessSnapshot(): Promise<MasterAccessSnapshotResult> {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    const isAdmin = await isPlatformAdminUser(user, serverSupabase);
    if (isAdmin) {
      return {
        ok: true,
        userId: user.id,
        snapshot: buildSpokeduMasterAccessSnapshot({ row: null, isAdmin: true }),
      };
    }

    const serviceSupabase = getServiceSupabase();
    const { row: subscription, error } = await ensureSpokeduMasterEntitlement(
      serviceSupabase,
      user.id,
    );

    if (error) {
      devLogger.error('[getSpokeduMasterAccessSnapshot] subscription lookup failed', error);
      await reportError(error, {
        context: 'spokedu_master.access_snapshot',
        tags: {
          stage: 'subscription_lookup',
          status: 500,
        },
      });
      return {
        ok: false,
        response: NextResponse.json({ error: 'Subscription lookup failed' }, { status: 500 }),
      };
    }

    return {
      ok: true,
      userId: user.id,
      snapshot: buildSpokeduMasterAccessSnapshot({ row: subscription, isAdmin: false }),
    };
  } catch (err) {
    devLogger.error('[getSpokeduMasterAccessSnapshot]', err);
    await reportError(err, {
      context: 'spokedu_master.access_snapshot',
      tags: {
        stage: 'unexpected',
        status: 500,
      },
    });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server error' }, { status: 500 }),
    };
  }
}
