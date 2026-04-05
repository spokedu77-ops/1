import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const ALLOWED_STATUS = ['trialing', 'active', 'past_due', 'canceled', 'expired'] as const;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = (searchParams.get('q') ?? '').trim();
    const limitRaw = Number(searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 100;

    const supabase = getServiceSupabase();
    let query = supabase
      .from('spokedu_pro_subscriptions')
      .select(
        `
        center_id,
        plan,
        status,
        trial_end,
        current_period_end,
        updated_at,
        stripe_customer_id,
        stripe_subscription_id,
        spokedu_pro_centers(id, name, owner_id)
      `
      )
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (status && (ALLOWED_STATUS as readonly string[]).includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((row) => {
      const rawCenter = row.spokedu_pro_centers;
      const center = Array.isArray(rawCenter) ? rawCenter[0] : rawCenter;
      return {
        centerId: row.center_id,
        centerName: center?.name ?? null,
        ownerId: center?.owner_id ?? null,
        plan: row.plan,
        status: row.status,
        trialEnd: row.trial_end,
        currentPeriodEnd: row.current_period_end,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        updatedAt: row.updated_at,
      };
    });

    const filteredRows = q
      ? rows.filter((row) => {
          const target = `${row.centerId} ${row.centerName ?? ''}`.toLowerCase();
          return target.includes(q.toLowerCase());
        })
      : rows;

    return NextResponse.json({ ok: true, rows: filteredRows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
