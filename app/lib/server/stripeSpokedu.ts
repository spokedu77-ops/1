import Stripe from 'stripe';

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

export function isStripeCheckoutConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID_BASIC?.trim() &&
      process.env.STRIPE_PRICE_ID_PRO?.trim()
  );
}

export function stripePriceIdForPlan(plan: 'basic' | 'pro'): string | null {
  const id =
    plan === 'basic'
      ? process.env.STRIPE_PRICE_ID_BASIC?.trim()
      : process.env.STRIPE_PRICE_ID_PRO?.trim();
  return id || null;
}

/** Stripe.Subscription.status → spokedu_pro_subscriptions.status */
export function mapStripeSubscriptionStatus(stripeStatus: string): 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'expired';
    case 'paused':
      return 'past_due';
    default:
      return 'past_due';
  }
}
