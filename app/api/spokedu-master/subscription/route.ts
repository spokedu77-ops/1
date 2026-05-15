import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type SubscriptionRow = {
  plan: string;
  status: string;
  period_end: string | null;
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ plan: 'free', status: 'none' });
  }

  const service = getServiceSupabase();
  const { data } = await service
    .from('spokedu_master_subscriptions')
    .select('plan, status, period_end')
    .eq('user_id', user.id)
    .maybeSingle() as { data: SubscriptionRow | null };

  if (!data || data.status !== 'active') {
    return NextResponse.json({ plan: 'free', status: data?.status ?? 'none' });
  }

  if (data.period_end && new Date(data.period_end) < new Date()) {
    return NextResponse.json({ plan: 'free', status: 'expired' });
  }

  return NextResponse.json({
    plan: data.plan,
    status: data.status,
    periodEnd: data.period_end,
  });
}
