import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getSpokeduMasterProfile } from '@/app/lib/server/spokeduMasterProfile';
import { isMasterLiteCappedEmail } from '@/app/lib/auth/platformAdminIdentity';
import { FREE_PREVIEW_PROGRAM_IDS } from '@/app/spokedu-master/lib/commercialProgramAccess';

const EXPIRED_ACCESS_MESSAGE =
  '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다. 이용권을 다시 선택해 주세요.';

type MasterPlan = 'lite' | 'premium' | 'team' | 'admin';

type MasterAccessOk = {
  ok: true;
  userId: string;
  isAdmin: boolean;
  plan: MasterPlan;
  canUseLibrary?: boolean;
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
  canBrowseLibrary: boolean;
  canUseLibrary: boolean;
  freePreviewProgramIds: readonly string[];
  canUseClassTools: boolean;
  canUseAttendance: boolean;
  canUseRecords: boolean;
  canUseSpomove: boolean;
  entitlementSource: 'none' | 'billing' | 'promotion' | 'admin';
  promotionalPlan: 'lite' | 'premium' | null;
  promotionalEndsAt: string | null;
};

export type MasterAccessSnapshotResult =
  | { ok: true; userId: string; snapshot: SpokeduMasterAccessSnapshot }
  | MasterAccessFail;

export type SpokeduMasterServerCapability = 'libraryBrowse' | 'library' | 'classTools' | 'attendance' | 'records' | 'spomove';

const CAPABILITY_FIELD: Record<SpokeduMasterServerCapability, keyof Pick<SpokeduMasterAccessSnapshot,
  'canBrowseLibrary' | 'canUseLibrary' | 'canUseClassTools' | 'canUseAttendance' | 'canUseRecords' | 'canUseSpomove'>> = {
  libraryBrowse: 'canBrowseLibrary',
  library: 'canUseLibrary',
  classTools: 'canUseClassTools',
  attendance: 'canUseAttendance',
  records: 'canUseRecords',
  spomove: 'canUseSpomove',
};

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
  renewal_retry_count?: number | null;
  last_billing_error?: string | null;
  next_retry_at?: string | null;
};

export type SpokeduMasterEntitlementGrantRow = {
  id: string;
  plan: 'lite' | 'premium';
  source: 'promo' | 'partner' | 'event' | 'support' | 'admin';
  campaign_id: string | null;
  starts_at: string;
  ends_at: string;
  activated_at: string;
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

export function evaluateSpokeduMasterEffectiveEntitlement(
  row: SpokeduMasterSubscriptionRow | null,
  grant: SpokeduMasterEntitlementGrantRow | null,
  now = Date.now(),
): SpokeduMasterEntitlementDecision & { source: 'none' | 'billing' | 'promotion' } {
  const billing = evaluateSpokeduMasterEntitlement(row, now);
  const grantStart = grant ? Date.parse(grant.starts_at) : Number.NaN;
  const grantEnd = grant ? Date.parse(grant.ends_at) : Number.NaN;
  const grantActive = Boolean(
    grant
    && Number.isFinite(grantStart)
    && Number.isFinite(grantEnd)
    && grantStart <= now
    && grantEnd > now,
  );

  if (!grantActive) return { ...billing, source: billing.allowed ? 'billing' : 'none' };
  if (billing.allowed && (billing.plan === 'premium' || billing.plan === 'team')) {
    return { ...billing, source: 'billing' };
  }
  if (billing.allowed && billing.plan === 'lite' && grant?.plan === 'lite') {
    return { ...billing, source: 'billing' };
  }
  return { allowed: true, plan: grant!.plan, status: 'active', source: 'promotion' };
}

function buildCapabilities(plan: SpokeduMasterAccessSnapshot['plan'], status: SpokeduMasterAccessSnapshot['subscriptionStatus'], isAdmin: boolean) {
  const freeFallback = {
    canBrowseLibrary: true,
    canUseLibrary: false,
    freePreviewProgramIds: FREE_PREVIEW_PROGRAM_IDS,
    canUseClassTools: true,
    canUseAttendance: false,
    canUseRecords: false,
    canUseSpomove: false,
  };

  if (isAdmin || (plan === 'team' && status === 'active')) {
    return {
      canBrowseLibrary: true,
      canUseLibrary: true,
      freePreviewProgramIds: FREE_PREVIEW_PROGRAM_IDS,
      canUseClassTools: true,
      canUseAttendance: true,
      canUseRecords: true,
      canUseSpomove: true,
    };
  }

  if (status !== 'active' || plan === 'free') return freeFallback;

  if (plan === 'lite') {
    return {
      canBrowseLibrary: true,
      canUseLibrary: true,
      freePreviewProgramIds: FREE_PREVIEW_PROGRAM_IDS,
      canUseClassTools: true,
      canUseAttendance: true,
      canUseRecords: true,
      canUseSpomove: false,
    };
  }

  if (plan === 'premium') {
    return {
      canBrowseLibrary: true,
      canUseLibrary: true,
      freePreviewProgramIds: FREE_PREVIEW_PROGRAM_IDS,
      canUseClassTools: true,
      canUseAttendance: true,
      canUseRecords: true,
      canUseSpomove: true,
    };
  }

  return freeFallback;
}

export function buildSpokeduMasterAccessSnapshot(input: {
  row: SpokeduMasterSubscriptionRow | null;
  grant?: SpokeduMasterEntitlementGrantRow | null;
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
      entitlementSource: 'admin',
      promotionalPlan: null,
      promotionalEndsAt: null,
      ...buildCapabilities('team', 'active', true),
    };
  }

  const entitlement = evaluateSpokeduMasterEffectiveEntitlement(input.row, input.grant ?? null);
  const plan = entitlement.plan === 'lite' || entitlement.plan === 'premium' || entitlement.plan === 'team'
    ? entitlement.plan
    : 'free';
  const subscriptionStatus = entitlement.allowed ? 'active' : input.row ? entitlement.status : 'none';
  const currentPeriodEnd = entitlement.source === 'promotion'
    ? input.grant?.ends_at ?? null
    : input.row?.current_period_end ?? input.row?.period_end ?? null;

  return {
    authenticated: true,
    onboardingDone: input.onboardingDone ?? false,
    plan,
    subscriptionStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd: input.row?.cancel_at_period_end ?? false,
    isAdmin: false,
    isCenterOrTeam: plan === 'team',
    entitlementSource: entitlement.source,
    promotionalPlan: input.grant?.plan ?? null,
    promotionalEndsAt: input.grant?.ends_at ?? null,
    ...buildCapabilities(plan, subscriptionStatus, false),
  };
}

/** 지정 계정의 MASTER 유효 이용권을 라이트로 맞춘다. 결제 행은 바꾸지 않는다. */
export function applyMasterLiteEntitlementCap(
  snapshot: SpokeduMasterAccessSnapshot,
): SpokeduMasterAccessSnapshot {
  return {
    authenticated: true,
    onboardingDone: true,
    plan: 'lite',
    subscriptionStatus: 'active',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isAdmin: false,
    isCenterOrTeam: false,
    entitlementSource: 'none',
    promotionalPlan: null,
    promotionalEndsAt: null,
    ...buildCapabilities('lite', 'active', false),
  };
}

type ServiceSupabase = ReturnType<typeof getServiceSupabase>;

export async function getActiveSpokeduMasterEntitlementGrant(
  serviceSupabase: ServiceSupabase,
  userId: string,
  now = new Date(),
): Promise<{ row: SpokeduMasterEntitlementGrantRow | null; error: unknown | null }> {
  const { data, error } = await serviceSupabase
    .from('spokedu_master_entitlement_grants')
    .select('id,plan,source,campaign_id,starts_at,ends_at,activated_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .lte('starts_at', now.toISOString())
    .gt('ends_at', now.toISOString())
    .order('plan', { ascending: false })
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { row: data as SpokeduMasterEntitlementGrantRow | null, error };
}

export async function ensureSpokeduMasterEntitlement(
  serviceSupabase: ServiceSupabase,
  userId: string,
): Promise<{ row: SpokeduMasterSubscriptionRow | null; error: unknown | null }> {
  const selectRow = async () => serviceSupabase
    .from('spokedu_master_subscriptions')
    .select('plan,status,period_end,cancel_at_period_end,next_billing_at,current_period_end,provider_billing_key_secret_id,renewal_retry_count,last_billing_error,next_retry_at')
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

    if (isMasterLiteCappedEmail(user.email)) {
      return { ok: true, userId: user.id, isAdmin: false, plan: 'lite', canUseLibrary: true };
    }

    const isAdmin = await isPlatformAdminUser(user, serverSupabase);
    if (isAdmin) {
      return { ok: true, userId: user.id, isAdmin: true, plan: 'admin', canUseLibrary: true };
    }

    const serviceSupabase = getServiceSupabase();
    const [{ row: subscription, error }, { row: grant, error: grantError }] = await Promise.all([
      ensureSpokeduMasterEntitlement(serviceSupabase, user.id),
      getActiveSpokeduMasterEntitlementGrant(serviceSupabase, user.id),
    ]);

    if (error || grantError) {
      devLogger.error('[requireSpokeduMasterAccess] entitlement lookup failed', error ?? grantError);
      await reportError(error ?? grantError, {
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

    const entitlement = evaluateSpokeduMasterEffectiveEntitlement(subscription, grant);

    if (entitlement.allowed && entitlement.status === 'active') {
      return {
        ok: true,
        userId: user.id,
        isAdmin: false,
        plan: entitlement.plan,
        canUseLibrary: true,
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

    const isAdmin = !isMasterLiteCappedEmail(user.email)
      && await isPlatformAdminUser(user, serverSupabase);

    return {
      ok: true,
      userId: user.id,
      isAdmin,
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

    if (isMasterLiteCappedEmail(user.email)) {
      return {
        ok: true,
        userId: user.id,
        snapshot: applyMasterLiteEntitlementCap(
          buildSpokeduMasterAccessSnapshot({ row: null, isAdmin: false, onboardingDone: true }),
        ),
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
    const [{ row: subscription, error }, { row: grant, error: grantError }, { row: profile, error: profileError }] = await Promise.all([
      ensureSpokeduMasterEntitlement(serviceSupabase, user.id),
      getActiveSpokeduMasterEntitlementGrant(serviceSupabase, user.id),
      getSpokeduMasterProfile(serviceSupabase, user.id),
    ]);

    if (error || grantError || profileError) {
      devLogger.error('[getSpokeduMasterAccessSnapshot] lookup failed', error ?? grantError ?? profileError);
      await reportError(error ?? grantError ?? profileError, {
        context: 'spokedu_master.access_snapshot',
        tags: {
          stage: error ? 'subscription_lookup' : 'profile_lookup',
          status: 500,
        },
      });
      return {
        ok: false,
        response: NextResponse.json({ error: 'Subscription lookup failed' }, { status: 500 }),
      };
    }

    const onboardingDone = Boolean(
      profile?.onboarding_done || isSpokeduMasterPaidPlanActive(subscription),
    );

    return {
      ok: true,
      userId: user.id,
      snapshot: buildSpokeduMasterAccessSnapshot({
        row: subscription,
        grant,
        isAdmin: false,
        onboardingDone,
      }),
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

export async function requireSpokeduMasterCapability(
  capability: SpokeduMasterServerCapability,
): Promise<MasterAccessResult> {
  const access = await getSpokeduMasterAccessSnapshot();
  if (!access.ok) return access;
  if (!access.snapshot[CAPABILITY_FIELD[capability]]) {
    const error = capability === 'spomove'
      ? 'Premium 이용권이 필요한 기능입니다.'
      : capability === 'library' || capability === 'attendance' || capability === 'records'
        ? 'Lite 이용권이 필요한 기능입니다.'
        : EXPIRED_ACCESS_MESSAGE;
    return {
      ok: false,
      response: NextResponse.json({ error }, { status: 403 }),
    };
  }
  return {
    ok: true,
    userId: access.userId,
    isAdmin: access.snapshot.isAdmin,
    plan: access.snapshot.isAdmin ? 'admin' : access.snapshot.plan as MasterPlan,
    canUseLibrary: access.snapshot.canUseLibrary,
  };
}
