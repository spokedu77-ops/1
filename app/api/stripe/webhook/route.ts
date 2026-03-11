/**
 * POST /api/stripe/webhook
 * Stripe 이벤트를 수신하여 구독 상태를 DB에 동기화.
 *
 * 처리 이벤트:
 *   checkout.session.completed   → 구독 활성화 (DB 레코드 생성/갱신)
 *   customer.subscription.updated → 플랜·상태 업데이트
 *   customer.subscription.deleted → 구독 만료 처리
 *   invoice.payment_failed        → past_due 처리
 *
 * 환경변수:
 *   STRIPE_WEBHOOK_SECRET  — Stripe 대시보드 > 웹훅 > 서명 시크릿
 *   STRIPE_SECRET_KEY      — Stripe 비밀 키 (구독 상세 조회용)
 *   SPOKEDU_PRO_DB_READY   — true 인 경우에만 DB 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const STRIPE_API = 'https://api.stripe.com/v1';

// Stripe-Signature 헤더 검증 (Web Crypto API — Edge Runtime 호환)
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;

  const signed = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === v1;
}

// Stripe API에서 구독 상세 조회
async function fetchStripeSubscription(subscriptionId: string, stripeKey: string) {
  const res = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Stripe plan → 내부 plan 매핑
function mapStripePlan(stripePlan: string | null | undefined): 'free' | 'basic' | 'pro' {
  if (!stripePlan) return 'free';
  const lower = stripePlan.toLowerCase();
  if (lower.includes('pro')) return 'pro';
  if (lower.includes('basic')) return 'basic';
  return 'free';
}

// Stripe subscription status → 내부 status 매핑
function mapStripeStatus(
  stripeStatus: string
): 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' {
  switch (stripeStatus) {
    case 'trialing': return 'trialing';
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    case 'unpaid':
    case 'incomplete_expired':
      return 'expired';
    default: return 'active';
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const dbReady = process.env.SPOKEDU_PRO_DB_READY === 'true';

  if (!dbReady) {
    // DB 마이그레이션 전에는 200 반환 (Stripe 재시도 방지)
    return NextResponse.json({ received: true, note: 'db_not_ready' });
  }

  if (!webhookSecret || !stripeKey) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET 또는 STRIPE_SECRET_KEY 미설정');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  const payload = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';

  const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret);
  if (!valid) {
    console.warn('[stripe/webhook] 서명 검증 실패');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const centerId = (session['metadata'] as Record<string, string> | null)?.['center_id'];
        const userId = (session['metadata'] as Record<string, string> | null)?.['user_id'];
        const plan = mapStripePlan(
          (session['metadata'] as Record<string, string> | null)?.['plan']
        );
        const stripeCustomerId = session['customer'] as string | null;
        const stripeSubscriptionId = session['subscription'] as string | null;

        if (!centerId || !stripeSubscriptionId) break;

        // 구독 상세 조회 (기간 정보)
        const stripeSub = await fetchStripeSubscription(stripeSubscriptionId, stripeKey);
        const currentPeriodStart = stripeSub?.current_period_start
          ? new Date((stripeSub.current_period_start as number) * 1000).toISOString()
          : null;
        const currentPeriodEnd = stripeSub?.current_period_end
          ? new Date((stripeSub.current_period_end as number) * 1000).toISOString()
          : null;

        await supabase.from('spokedu_pro_subscriptions').upsert(
          {
            center_id: centerId,
            plan,
            status: 'active',
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            canceled_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'center_id' }
        );

        // center owner_id 동기화 (bootstrap 전에 결제한 경우 대비)
        if (userId) {
          const { data: center } = await supabase
            .from('spokedu_pro_centers')
            .select('id')
            .eq('id', centerId)
            .maybeSingle();

          if (!center) {
            // 센터 레코드가 없으면 생성
            const { data: profile } = await supabase
              .from('users')
              .select('name')
              .eq('id', userId)
              .maybeSingle();
            const centerName = (profile?.name as string | null) ?? '내 센터';
            await supabase.from('spokedu_pro_centers').insert({
              id: centerId,
              owner_id: userId,
              name: centerName,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const stripeSubscriptionId = sub['id'] as string;
        const stripeStatus = sub['status'] as string;
        const items = sub['items'] as { data: Array<{ price: { nickname?: string; id: string } }> } | null;
        const priceNickname = items?.data?.[0]?.price?.nickname;
        const priceId = items?.data?.[0]?.price?.id;
        const plan = mapStripePlan(priceNickname ?? priceId);
        const status = mapStripeStatus(stripeStatus);
        const cancelAtPeriodEnd = sub['cancel_at_period_end'] as boolean;
        const currentPeriodEnd = sub['current_period_end']
          ? new Date((sub['current_period_end'] as number) * 1000).toISOString()
          : null;

        await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            plan: cancelAtPeriodEnd ? plan : plan,
            status: cancelAtPeriodEnd ? 'canceled' : status,
            current_period_end: currentPeriodEnd,
            canceled_at: cancelAtPeriodEnd ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubscriptionId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const stripeSubscriptionId = sub['id'] as string;

        await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            plan: 'free',
            status: 'expired',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubscriptionId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice['subscription'] as string | null;
        if (!stripeSubscriptionId) break;

        await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubscriptionId);
        break;
      }

      default:
        // 처리하지 않는 이벤트 — 정상 응답으로 재시도 방지
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] 이벤트 처리 오류 (${event.type})`, err);
    return NextResponse.json({ error: 'processing_error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
