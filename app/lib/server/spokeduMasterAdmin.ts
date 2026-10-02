import {
  evaluateSpokeduMasterEffectiveEntitlement,
  evaluateSpokeduMasterEntitlement,
  type SpokeduMasterEntitlementGrantRow,
  type SpokeduMasterSubscriptionRow,
} from '@/app/lib/server/spokeduMasterAccess';

export type MasterAdminPlan = 'free' | 'lite' | 'premium' | 'team';

export function maskAdminEmail(email: string | null | undefined) {
  if (!email) return '-';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, Math.min(3, local.length))}***@${domain}`;
}

export function buildMasterAdminAccess(input: {
  subscription: SpokeduMasterSubscriptionRow | null;
  grant: SpokeduMasterEntitlementGrantRow | null;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const paid = evaluateSpokeduMasterEntitlement(input.subscription, now);
  const effective = evaluateSpokeduMasterEffectiveEntitlement(input.subscription, input.grant, now);
  return {
    paidPlan: paid.allowed ? paid.plan : 'free',
    paidStatus: input.subscription?.status ?? 'none',
    effectivePlan: effective.allowed ? effective.plan : 'free',
    effectiveSource: effective.source,
    promoPlan: input.grant?.plan ?? null,
    promoStartsAt: input.grant?.starts_at ?? null,
    promoEndsAt: input.grant?.ends_at ?? null,
    fallbackPlan: paid.allowed ? paid.plan : 'free',
  };
}

export function grantStatus(grant: { starts_at: string; ends_at: string; revoked_at?: string | null }, now = Date.now()) {
  if (grant.revoked_at) return 'revoked' as const;
  if (Date.parse(grant.starts_at) > now) return 'scheduled' as const;
  if (Date.parse(grant.ends_at) <= now) return 'expired' as const;
  return 'active' as const;
}
