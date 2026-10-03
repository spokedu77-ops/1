import type { SupabaseClient } from '@supabase/supabase-js';

export const MASTER_FUNNEL_EVENT_NAMES = [
  'landing_visit',
  'onboarding_completed',
  'first_value_program_detail',
  'core_use_daily',
  'upgrade_intent',
  'checkout_started',
] as const;

export type MasterFunnelEventName = typeof MASTER_FUNNEL_EVENT_NAMES[number];

export type MasterFunnelEventRow = {
  name: MasterFunnelEventName;
  user_id: string | null;
  created_at: string;
};

export type MasterFunnelMember = {
  id: string;
  createdAt: string | null;
  effectivePlan: string;
  subscription: null | {
    cancelAtPeriodEnd: boolean;
    renewalRetryCount: number;
    lastBillingError: string | null;
    nextRetryAt: string | null;
  };
};

export type MasterFunnelPayment = {
  user_id: string;
  applied_at: string | null;
};

export type MasterFunnelWindow = {
  days: 7 | 30;
  landingVisits: number;
  signups: number;
  onboardingCompleted: number;
  firstValue: number;
  returningUse: number;
  upgradeIntent: number;
  checkoutStarted: number;
  paymentSuccess: number;
  activePaid: number;
  cancelScheduled: number;
  renewalFailures: number;
};

function after(value: string | null | undefined, cutoff: number) {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) && parsed >= cutoff;
}

function distinctUsers(events: MasterFunnelEventRow[], name: MasterFunnelEventName, cutoff: number) {
  return new Set(events.filter((event) => event.name === name && event.user_id && after(event.created_at, cutoff)).map((event) => event.user_id)).size;
}

export function buildMasterFunnelWindow(input: {
  days: 7 | 30;
  now: number;
  members: MasterFunnelMember[];
  events: MasterFunnelEventRow[];
  payments: MasterFunnelPayment[];
}): MasterFunnelWindow {
  const cutoff = input.now - input.days * 24 * 60 * 60 * 1000;
  const productionIds = new Set(input.members.map((member) => member.id));
  const membersById = new Map(input.members.map((member) => [member.id, member]));
  const productEvents = input.events.filter((event) => event.user_id == null || productionIds.has(event.user_id));
  const returningUsers = new Set(productEvents.filter((event) => {
    if (event.name !== 'core_use_daily' || !event.user_id || !after(event.created_at, cutoff)) return false;
    const member = membersById.get(event.user_id);
    if (!member?.createdAt) return false;
    return event.created_at.slice(0, 10) > member.createdAt.slice(0, 10);
  }).map((event) => event.user_id));

  return {
    days: input.days,
    landingVisits: productEvents.filter((event) => event.name === 'landing_visit' && after(event.created_at, cutoff)).length,
    signups: input.members.filter((member) => after(member.createdAt, cutoff)).length,
    onboardingCompleted: distinctUsers(productEvents, 'onboarding_completed', cutoff),
    firstValue: distinctUsers(productEvents, 'first_value_program_detail', cutoff),
    returningUse: returningUsers.size,
    upgradeIntent: distinctUsers(productEvents, 'upgrade_intent', cutoff),
    checkoutStarted: distinctUsers(productEvents, 'checkout_started', cutoff),
    paymentSuccess: new Set(input.payments.filter((payment) => productionIds.has(payment.user_id) && after(payment.applied_at, cutoff)).map((payment) => payment.user_id)).size,
    activePaid: input.members.filter((member) => member.effectivePlan === 'lite' || member.effectivePlan === 'premium').length,
    cancelScheduled: input.members.filter((member) => member.subscription?.cancelAtPeriodEnd).length,
    renewalFailures: input.members.filter((member) => Boolean(member.subscription?.lastBillingError || member.subscription?.nextRetryAt || (member.subscription?.renewalRetryCount ?? 0) > 0)).length,
  };
}

export function buildMasterFunnelEventKey(name: MasterFunnelEventName, userId: string, occurredAt = new Date()) {
  if (name === 'onboarding_completed' || name === 'first_value_program_detail') return `master:${name}:${userId}`;
  if (name === 'core_use_daily') return `master:${name}:${userId}:${occurredAt.toISOString().slice(0, 10)}`;
  return null;
}

export async function recordMasterFunnelEvent(input: {
  service: Pick<SupabaseClient, 'from'>;
  name: MasterFunnelEventName;
  userId: string | null;
  context?: Record<string, string>;
  occurredAt?: Date;
}) {
  const eventKey = input.userId ? buildMasterFunnelEventKey(input.name, input.userId, input.occurredAt) : null;
  const row = {
    name: input.name,
    route: 'master',
    user_id: input.userId,
    event_key: eventKey,
    payload: input.context ?? {},
  };
  const query = input.service.from('commercial_funnel_events');
  const { error } = eventKey
    ? await query.upsert(row, { onConflict: 'event_key', ignoreDuplicates: true })
    : await query.insert(row);
  return { stored: !error, error };
}
