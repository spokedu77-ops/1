/**
 * Stripe → spokedu_pro_subscriptions 동기화.
 * Stripe Dashboard에서 Webhook endpoint로 등록: customer.subscription.* , invoice.payment_failed , invoice.paid (권장)
 *
 * 필요: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 *
 * 멱등: spokedu_pro_stripe_webhook_events.event.id — docs/spokedu-subscription-stripe-env.md
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getStripeClient, mapStripeSubscriptionStatus } from '@/app/lib/server/stripeSpokedu';
import { logStripeWebhook, notifyStripeWebhookOps } from '@/app/lib/server/stripeWebhookLog';

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !whSecret) {
    logStripeWebhook({ level: 'warn', step: 'not_configured' });
    return NextResponse.json({ error: 'stripe_webhook_not_configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (e) {
    logStripeWebhook({
      level: 'error',
      step: 'signature_verify_failed',
      err: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const eventId = event.id;

  try {
    const { data: seen, error: seenErr } = await supabase
      .from('spokedu_pro_stripe_webhook_events')
      .select('stripe_event_id')
      .eq('stripe_event_id', eventId)
      .maybeSingle();

    if (seenErr) {
      logStripeWebhook({
        level: 'warn',
        step: 'idempotency_lookup_error',
        eventId,
        eventType: event.type,
        err: seenErr.message,
      });
    } else if (seen?.stripe_event_id) {
      logStripeWebhook({ step: 'duplicate_event_ignored', eventId, eventType: event.type });
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const centerId = sub.metadata?.center_id;
        const targetPlan = sub.metadata?.target_plan;
        if (!centerId) {
          logStripeWebhook({
            level: 'warn',
            step: 'subscription_missing_center_metadata',
            eventId,
            stripeSubscriptionId: sub.id,
          });
          break;
        }
        const plan =
          targetPlan === 'pro' || targetPlan === 'basic' ? targetPlan : 'basic';
        const status = mapStripeSubscriptionStatus(sub.status);
        const currentEnd =
          typeof sub.current_period_end === 'number'
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
        const trialEnd =
          typeof sub.trial_end === 'number' && sub.trial_end > 0
            ? new Date(sub.trial_end * 1000).toISOString()
            : null;

        const maxClasses = plan === 'pro' ? null : plan === 'basic' ? 3 : 1;
        const { error } = await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            stripe_subscription_id: sub.id,
            plan,
            status,
            max_classes: maxClasses,
            current_period_end: currentEnd,
            trial_end: trialEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('center_id', centerId);

        if (error) {
          logStripeWebhook({
            level: 'error',
            step: 'subscription_update_failed',
            eventId,
            centerId,
            err: error.message,
          });
          await notifyStripeWebhookOps('Stripe webhook: subscription DB update failed', {
            eventId,
            centerId,
            error,
          });
          return NextResponse.json({ error: 'db_update_failed' }, { status: 500 });
        }
        logStripeWebhook({
          step: 'subscription_updated',
          eventId,
          centerId,
          plan,
          status,
          stripeSubscriptionId: sub.id,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const centerId = sub.metadata?.center_id;
        if (!centerId) break;
        const { error } = await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('center_id', centerId);
        if (error) {
          logStripeWebhook({
            level: 'error',
            step: 'subscription_deleted_update_failed',
            eventId,
            centerId,
            err: error.message,
          });
          await notifyStripeWebhookOps('Stripe webhook: canceled status update failed', {
            eventId,
            centerId,
            error,
          });
          return NextResponse.json({ error: 'db_update_failed' }, { status: 500 });
        }
        logStripeWebhook({ step: 'subscription_canceled', eventId, centerId });
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const subId =
          typeof inv.subscription === 'string'
            ? inv.subscription
            : inv.subscription?.id ?? null;
        if (!subId) {
          logStripeWebhook({
            level: 'warn',
            step: 'invoice_payment_failed_no_subscription',
            eventId,
            invoiceId: inv.id,
          });
          break;
        }
        const { data: rows, error } = await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId)
          .select('center_id');

        if (error) {
          logStripeWebhook({
            level: 'error',
            step: 'invoice_past_due_update_failed',
            eventId,
            subId,
            err: error.message,
          });
          await notifyStripeWebhookOps('Stripe webhook: invoice past_due update failed', {
            eventId,
            subId,
            error,
          });
          return NextResponse.json({ error: 'db_update_failed' }, { status: 500 });
        }
        if (!rows?.length) {
          logStripeWebhook({
            level: 'warn',
            step: 'invoice_past_due_no_matching_row',
            eventId,
            subId,
            invoiceId: inv.id,
          });
        } else {
          logStripeWebhook({
            step: 'invoice_marked_past_due',
            eventId,
            subId,
            centerIds: rows.map((r) => r.center_id),
          });
        }
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const subId =
          typeof inv.subscription === 'string'
            ? inv.subscription
            : inv.subscription?.id ?? null;
        if (!subId) {
          logStripeWebhook({
            level: 'warn',
            step: 'invoice_paid_no_subscription',
            eventId,
            invoiceId: inv.id,
          });
          break;
        }
        let stripeSub: Stripe.Subscription;
        try {
          stripeSub = await stripe.subscriptions.retrieve(subId);
        } catch (e) {
          logStripeWebhook({
            level: 'warn',
            step: 'invoice_paid_sub_retrieve_failed',
            eventId,
            subId,
            err: e instanceof Error ? e.message : String(e),
          });
          break;
        }
        const centerId = stripeSub.metadata?.center_id;
        if (!centerId) {
          logStripeWebhook({
            level: 'warn',
            step: 'invoice_paid_missing_center_metadata',
            eventId,
            stripeSubscriptionId: subId,
          });
          break;
        }
        const targetPlan = stripeSub.metadata?.target_plan;
        const plan =
          targetPlan === 'pro' || targetPlan === 'basic' ? targetPlan : 'basic';
        const status = mapStripeSubscriptionStatus(stripeSub.status);
        const currentEnd =
          typeof stripeSub.current_period_end === 'number'
            ? new Date(stripeSub.current_period_end * 1000).toISOString()
            : null;
        const trialEnd =
          typeof stripeSub.trial_end === 'number' && stripeSub.trial_end > 0
            ? new Date(stripeSub.trial_end * 1000).toISOString()
            : null;
        const maxClasses = plan === 'pro' ? null : plan === 'basic' ? 3 : 1;
        const { data: paidRows, error } = await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            stripe_subscription_id: stripeSub.id,
            plan,
            status,
            max_classes: maxClasses,
            current_period_end: currentEnd,
            trial_end: trialEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('center_id', centerId)
          .select('center_id');

        if (error) {
          logStripeWebhook({
            level: 'error',
            step: 'invoice_paid_update_failed',
            eventId,
            centerId,
            err: error.message,
          });
          await notifyStripeWebhookOps('Stripe webhook: invoice.paid subscription sync failed', {
            eventId,
            centerId,
            error,
          });
          return NextResponse.json({ error: 'db_update_failed' }, { status: 500 });
        }
        if (!paidRows?.length) {
          logStripeWebhook({
            level: 'warn',
            step: 'invoice_paid_no_matching_row',
            eventId,
            centerId,
            stripeSubscriptionId: subId,
          });
          break;
        }
        logStripeWebhook({
          step: 'invoice_paid_subscription_synced',
          eventId,
          centerId,
          plan,
          status,
          stripeSubscriptionId: subId,
        });
        break;
      }
      default:
        logStripeWebhook({ step: 'event_type_unhandled', eventId, eventType: event.type });
        break;
    }

    const { error: markErr } = await supabase.from('spokedu_pro_stripe_webhook_events').insert({
      stripe_event_id: eventId,
      event_type: event.type,
    });
    if (markErr && markErr.code !== '23505') {
      logStripeWebhook({
        level: 'error',
        step: 'idempotency_insert_failed',
        eventId,
        err: markErr.message,
      });
      await notifyStripeWebhookOps('Stripe webhook: idempotency insert failed', {
        eventId,
        error: markErr,
      });
    }
  } catch (e) {
    logStripeWebhook({
      level: 'error',
      step: 'handler_exception',
      eventId,
      err: e instanceof Error ? e.message : String(e),
    });
    await notifyStripeWebhookOps('Stripe webhook: handler exception', { eventId, error: String(e) });
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
