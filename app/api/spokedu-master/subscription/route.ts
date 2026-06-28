import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson } from '@/app/lib/server/privateNoStore';
import {
  ensureSpokeduMasterEntitlement,
  evaluateSpokeduMasterEntitlement,
} from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateNoStoreJson({ plan: 'free', status: 'none', isAdmin: false });
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
    });
  }

  const { row, error } = await ensureSpokeduMasterEntitlement(
    getServiceSupabase(),
    user.id,
  );
  if (error || !row) {
    return privateNoStoreJson(
      { error: 'Subscription lookup failed' },
      { status: 500 },
    );
  }

  const common = {
    isAdmin: false,
    userId: user.id,
    email: user.email ?? null,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    periodEnd: row.period_end,
  };

  const entitlement = evaluateSpokeduMasterEntitlement(row);

  if (entitlement.allowed && entitlement.status === 'active') {
    return privateNoStoreJson({
      ...common,
      plan: entitlement.plan,
      status: 'active',
    });
  }

  if (entitlement.plan === 'pro' || entitlement.plan === 'team') {
    return privateNoStoreJson({
      ...common,
      plan: entitlement.plan,
      status: entitlement.status,
      trialEndsAt: null,
    });
  }

  return privateNoStoreJson({
    ...common,
    plan: 'free',
    status: entitlement.status,
  });
}
