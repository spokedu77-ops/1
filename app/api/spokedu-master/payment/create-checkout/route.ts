import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

const PLAN_CONFIG = {
  pro: {
    name: 'SPOKEDU PRO — Pro 플랜',
    amount: 39900,
  },
  team: {
    name: 'SPOKEDU PRO — Center 플랜',
    amount: 79000,
  },
} as const;

type PlanKey = keyof typeof PLAN_CONFIG;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { plan?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const planKey = body.plan as PlanKey;
  const plan = PLAN_CONFIG[planKey];
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const orderId = `spm-${planKey}-${Date.now()}`;
  const customerName = user.email?.split('@')[0] ?? '선생님';

  return NextResponse.json({
    orderId,
    orderName: plan.name,
    amount: plan.amount,
    customerEmail: user.email ?? '',
    customerName,
  });
}
