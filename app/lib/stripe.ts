import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
});

export default stripe;

/** 플랜 → Stripe Price ID 매핑 */
export function getPriceId(plan: 'basic' | 'pro'): string {
  const map: Record<string, string | undefined> = {
    basic: process.env.STRIPE_BASIC_PRICE_ID,
    pro: process.env.STRIPE_PRO_PRICE_ID,
  };
  const priceId = map[plan];
  if (!priceId) throw new Error(`STRIPE_${plan.toUpperCase()}_PRICE_ID is not set`);
  return priceId;
}
