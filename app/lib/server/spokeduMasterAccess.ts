import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { reportError } from '@/app/lib/monitoring/errorReporter';

const TRIAL_DAYS = 14;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
const EXPIRED_ACCESS_MESSAGE =
  '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다. 30일 이용권을 다시 결제해 주세요.';

type MasterPlan = 'trial' | 'pro' | 'team' | 'admin';

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

export type SpokeduMasterSubscriptionRow = {
  plan: string | null;
  status: string | null;
  period_end: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

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
): row is SpokeduMasterSubscriptionRow & { plan: 'pro' | 'team' } {
  if (!row) return false;
  if (row.status !== 'active') return false;
  if (row.plan !== 'pro' && row.plan !== 'team') return false;
  if (!row.period_end) return false;
  const periodEndMs = Date.parse(row.period_end);
  return Number.isFinite(periodEndMs) && periodEndMs > Date.now();
}

export function isSpokeduMasterPaidPlanExpired(row: SpokeduMasterSubscriptionRow | null): boolean {
  if (!row) return false;
  if (row.status !== 'active') return false;
  if (row.plan !== 'pro' && row.plan !== 'team') return false;
  if (!row.period_end) return true;
  const periodEndMs = Date.parse(row.period_end);
  return !Number.isFinite(periodEndMs) || periodEndMs <= Date.now();
}

type ServiceSupabase = ReturnType<typeof getServiceSupabase>;

export async function ensureSpokeduMasterEntitlement(
  serviceSupabase: ServiceSupabase,
  userId: string,
): Promise<{ row: SpokeduMasterSubscriptionRow | null; error: unknown | null }> {
  const selectRow = async () => serviceSupabase
    .from('spokedu_master_subscriptions')
    .select('plan,status,period_end,trial_started_at,trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle();

  const existing = await selectRow();
  if (existing.error) return { row: null, error: existing.error };
  if (existing.data) {
    return { row: existing.data as SpokeduMasterSubscriptionRow, error: null };
  }

  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt.getTime() + TRIAL_MS);
  const inserted = await serviceSupabase
    .from('spokedu_master_subscriptions')
    .insert({
      user_id: userId,
      plan: 'free',
      status: 'trial',
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    });

  if (inserted.error && (inserted.error as { code?: string }).code !== '23505') {
    return { row: null, error: inserted.error };
  }

  const resolved = await selectRow();
  return {
    row: (resolved.data as SpokeduMasterSubscriptionRow | null) ?? null,
    error: resolved.error ?? null,
  };
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

    if (isSpokeduMasterPaidPlanActive(subscription)) {
      return {
        ok: true,
        userId: user.id,
        isAdmin: false,
        plan: subscription.plan,
      };
    }

    if (isSpokeduMasterPaidPlanExpired(subscription)) {
      return {
        ok: false,
        response: NextResponse.json({ error: EXPIRED_ACCESS_MESSAGE }, { status: 403 }),
      };
    }

    if (isSpokeduMasterTrialActive(subscription)) {
      return { ok: true, userId: user.id, isAdmin: false, plan: 'trial' };
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
