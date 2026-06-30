import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type StoreBillingKeyInput = {
  userId: string;
  billingKey: string;
};

type BillingKeySecretInput = {
  userId: string;
  secretId?: string | null;
};

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

async function reportVaultError(error: unknown, stage: string) {
  await reportError(error, {
    context: 'spokedu_master.billing_key_vault',
    tags: { provider: 'supabase_vault', stage, status: 500 },
  });
}

export async function storeSpokeduMasterBillingKey(input: StoreBillingKeyInput): Promise<string | null> {
  if (!input.userId || !input.billingKey) return null;

  const service = getServiceSupabase();
  const { data, error } = await service.rpc('spokedu_master_store_billing_key', {
    p_user_id: input.userId,
    p_billing_key: input.billingKey,
  });

  if (error) {
    await reportVaultError(error, 'store');
    return null;
  }

  return isUuid(typeof data === 'string' ? data : null) ? data : null;
}

export async function readSpokeduMasterBillingKey(input: BillingKeySecretInput): Promise<string | null> {
  if (!input.userId || !isUuid(input.secretId)) return null;

  const service = getServiceSupabase();
  const { data, error } = await service.rpc('spokedu_master_read_billing_key', {
    p_user_id: input.userId,
    p_secret_id: input.secretId,
  });

  if (error) {
    await reportVaultError(error, 'read');
    return null;
  }

  return typeof data === 'string' && data.length > 0 ? data : null;
}

export async function deleteSpokeduMasterBillingKey(input: BillingKeySecretInput): Promise<boolean> {
  if (!input.userId || !isUuid(input.secretId)) return true;

  const service = getServiceSupabase();
  const { data, error } = await service.rpc('spokedu_master_delete_billing_key', {
    p_user_id: input.userId,
    p_secret_id: input.secretId,
  });

  if (error) {
    await reportVaultError(error, 'delete');
    return false;
  }

  return data === true;
}
