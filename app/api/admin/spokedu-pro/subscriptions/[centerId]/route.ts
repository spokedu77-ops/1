import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
type Plan = 'free' | 'basic' | 'pro';

const ALLOWED_STATUS: SubscriptionStatus[] = ['trialing', 'active', 'past_due', 'canceled', 'expired'];
const ALLOWED_PLAN: Plan[] = ['free', 'basic', 'pro'];

function monthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ centerId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { centerId } = await context.params;
    const id = String(centerId ?? '').trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: 'centerId is required' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      status?: unknown;
      plan?: unknown;
      trialEnd?: unknown;
      currentPeriodEnd?: unknown;
      maxClasses?: unknown;
      reason?: unknown;
    };

    const nextStatus = typeof body.status === 'string' ? body.status.trim() : '';
    const nextPlan = typeof body.plan === 'string' ? body.plan.trim() : '';
    if (!ALLOWED_STATUS.includes(nextStatus as SubscriptionStatus)) {
      return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });
    }
    if (nextPlan && !ALLOWED_PLAN.includes(nextPlan as Plan)) {
      return NextResponse.json({ ok: false, error: 'invalid plan' }, { status: 400 });
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return NextResponse.json({ ok: false, error: 'reason is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: prev, error: prevErr } = await supabase
      .from('spokedu_pro_subscriptions')
      .select('center_id, plan, status, trial_end, current_period_end, max_classes')
      .eq('center_id', id)
      .maybeSingle();

    if (prevErr) {
      return NextResponse.json({ ok: false, error: prevErr.message }, { status: 500 });
    }
    if (!prev) {
      return NextResponse.json({ ok: false, error: 'subscription not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    if (nextPlan) {
      updates.plan = nextPlan;
    }

    if (typeof body.maxClasses === 'number' && Number.isFinite(body.maxClasses)) {
      updates.max_classes = body.maxClasses;
    }

    if (typeof body.trialEnd === 'string' && body.trialEnd.trim()) {
      updates.trial_end = body.trialEnd.trim();
    }
    if (typeof body.currentPeriodEnd === 'string' && body.currentPeriodEnd.trim()) {
      updates.current_period_end = body.currentPeriodEnd.trim();
    }

    if (nextStatus === 'expired' && !nextPlan) {
      updates.plan = 'free';
      updates.max_classes = 1;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('spokedu_pro_subscriptions')
      .update(updates)
      .eq('center_id', id)
      .select('center_id, plan, status, trial_end, current_period_end, max_classes, updated_at')
      .single();

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    await supabase.from('admin_productivity_events').insert({
      event_type: 'SUBSCRIPTION_STATUS_UPDATED',
      month_key: monthKey(),
      actor_id: auth.userId,
      meta: {
        centerId: id,
        reason,
        before: {
          status: prev.status,
          plan: prev.plan,
          trialEnd: prev.trial_end,
          currentPeriodEnd: prev.current_period_end,
          maxClasses: prev.max_classes,
        },
        after: {
          status: updated.status,
          plan: updated.plan,
          trialEnd: updated.trial_end,
          currentPeriodEnd: updated.current_period_end,
          maxClasses: updated.max_classes,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      centerId: id,
      updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
