import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson } from '@/app/lib/server/privateNoStore';
import {
  isSpokeduMasterPaidPlanActive,
  isSpokeduMasterPaidPlanExpired,
  type SpokeduMasterSubscriptionRow,
} from '@/app/lib/server/spokeduMasterAccess';

type SubscriptionRow = {
  plan: string;
  status: string;
  period_end: string | null;
};

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

  const isAdmin = await isPlatformAdminUser(user, supabase);

  if (isAdmin) {
    return privateNoStoreJson({
      plan: 'team',
      status: 'active',
      isAdmin: true,
      userId: user.id,
      email: user.email ?? null,
      trialEndsAt: null,
    });
  }

  const trialEndsAt = new Date(new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const service = getServiceSupabase();
  const { data } = (await service
    .from('spokedu_master_subscriptions')
    .select('plan, status, period_end')
    .eq('user_id', user.id)
    .maybeSingle()) as { data: SubscriptionRow | null };

  if (
    data &&
    data.status === 'expired' &&
    (data.plan === 'pro' || data.plan === 'team')
  ) {
    return privateNoStoreJson({
      plan: data.plan,
      status: 'expired',
      periodEnd: data.period_end,
      isAdmin: false,
      userId: user.id,
      email: user.email ?? null,
      trialEndsAt: null,
    });
  }

  if (!data || data.status !== 'active') {
    return privateNoStoreJson({ plan: 'free', status: data?.status ?? 'none', isAdmin: false, userId: user.id, email: user.email ?? null, trialEndsAt });
  }

  if (!isSpokeduMasterPaidPlanActive(data as SpokeduMasterSubscriptionRow | null)) {
    return privateNoStoreJson({
      plan: data.plan,
      status: 'expired',
      periodEnd: data.period_end,
      isAdmin: false,
      userId: user.id,
      email: user.email ?? null,
      trialEndsAt: isSpokeduMasterPaidPlanExpired(data as SpokeduMasterSubscriptionRow | null) ? null : trialEndsAt,
    });
  }

  return privateNoStoreJson({
    plan: data.plan,
    status: data.status,
    periodEnd: data.period_end,
    isAdmin: false,
    userId: user.id,
    email: user.email ?? null,
    trialEndsAt,
  });
}
