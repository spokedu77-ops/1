export type MasterAccountClass = 'production' | 'qa_test' | 'internal' | 'inactive' | 'spokedu_only';

type Metadata = Record<string, unknown> | null | undefined;

export type MasterPopulationIdentity = {
  appMetadata?: Metadata;
  userMetadata?: Metadata;
  bannedUntil?: string | null;
  deletedAt?: string | null;
};

export type MasterPopulationProfile = {
  name?: string | null;
  school?: string | null;
  created_at?: string | null;
} | null;

export type MasterPopulationAppUser = {
  role?: string | null;
  is_admin?: boolean | null;
  is_active?: boolean | null;
  status?: string | null;
} | null;

export type MasterPopulationSubscription = {
  status?: string | null;
  pg_provider?: string | null;
  toss_order_id?: string | null;
  provider_customer_key?: string | null;
  last_payment_at?: string | null;
  created_at?: string | null;
} | null;

function isTrue(value: unknown) {
  return value === true || value === 'true';
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Reporting-only QA classification. This is not an authorization decision.
 * app_metadata is the durable marker for new fixtures; user_metadata and the
 * subscription fingerprints are compatibility rules for existing fixtures.
 */
export function isMasterQaAccount(input: {
  identity: MasterPopulationIdentity;
  profile: MasterPopulationProfile;
  subscription: MasterPopulationSubscription;
}) {
  const app = input.identity.appMetadata ?? {};
  const user = input.identity.userMetadata ?? {};
  const explicitMarker =
    text(app.spokedu_master_account_type) === 'qa' ||
    isTrue(app.spokedu_master_qa) ||
    isTrue(user.qa) ||
    text(user.app) === 'spokedu-master' && text(user.purpose).includes('qa') ||
    typeof user.spokeduMasterFixture === 'string';
  if (explicitMarker) return true;

  const subscription = input.subscription;
  if (text(subscription?.pg_provider) === 'manual_qa') return true;

  // Legacy wipe fixtures were created as Toss subscriptions without any
  // successful billing artifact. Product subscriptions are only created by a
  // successful paid-billing flow, so this impossible production combination is
  // a deterministic fixture fingerprint rather than an email heuristic.
  const hasBillingArtifact = Boolean(
    subscription?.toss_order_id ||
    subscription?.provider_customer_key ||
    subscription?.last_payment_at,
  );
  const profileCreated = Date.parse(input.profile?.created_at ?? '');
  const subscriptionCreated = Date.parse(subscription?.created_at ?? '');
  const createdTogether = Number.isFinite(profileCreated) && Number.isFinite(subscriptionCreated)
    && Math.abs(profileCreated - subscriptionCreated) <= 5_000;
  if (text(subscription?.pg_provider) === 'tosspayments' && !hasBillingArtifact && createdTogether) return true;

  return text(input.profile?.name) === 'qa' && text(input.profile?.school) === 'qa';
}

export function classifyMasterAccount(input: {
  hasMasterProfile: boolean;
  identity: MasterPopulationIdentity;
  profile: MasterPopulationProfile;
  appUser: MasterPopulationAppUser;
  subscription: MasterPopulationSubscription;
}): MasterAccountClass {
  // A subscription/grant/operation can be created administratively for an
  // existing SPOKEDU identity. Only a MASTER profile proves that the person
  // actually entered the MASTER signup/onboarding flow.
  if (!input.hasMasterProfile) return 'spokedu_only';
  if (isMasterQaAccount(input)) return 'qa_test';

  const role = text(input.appUser?.role) || text(input.identity.appMetadata?.role);
  if (input.appUser?.is_admin === true || role === 'admin' || role === 'master') return 'internal';

  const inactive = input.appUser?.is_active === false
    || text(input.appUser?.status) === 'inactive'
    || Boolean(input.identity.deletedAt)
    || (Boolean(input.identity.bannedUntil) && Date.parse(input.identity.bannedUntil ?? '') > Date.now());
  if (inactive) return 'inactive';

  return 'production';
}

export function hasRenewalProblem(subscription: {
  status?: string | null;
  renewal_retry_count?: number | null;
  last_billing_error?: string | null;
  next_retry_at?: string | null;
} | null) {
  if (!subscription?.last_billing_error) return false;
  return (subscription.renewal_retry_count ?? 0) > 0
    || Boolean(subscription.next_retry_at)
    || ['past_due', 'payment_failed'].includes(text(subscription.status));
}
