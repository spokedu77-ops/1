import type { SupabaseClient } from '@supabase/supabase-js';

/** processing 주문이 이 시간보다 오래되면 다른 워커가 claim을 재개할 수 있다. */
export const SPOKEDU_MASTER_BILLING_PROCESSING_STALE_MS = 15 * 60 * 1000;

export type SpokeduMasterBillingOrderClaimRow = {
  order_id: string;
  status: string | null;
  payment_key: string | null;
  updated_at?: string | null;
};

type ServiceClient = SupabaseClient;

function staleProcessingCutoffIso(now = Date.now()): string {
  return new Date(now - SPOKEDU_MASTER_BILLING_PROCESSING_STALE_MS).toISOString();
}

/**
 * pending/failed/recoverable_failed 주문을 processing으로 원자 claim한다.
 * 오래된 processing은 lease 만료로 재claim한다.
 */
export async function claimSpokeduMasterBillingOrder(input: {
  service: ServiceClient;
  orderId: string;
}): Promise<{ claimed: boolean; error: unknown | null }> {
  const { data: claimed, error } = await input.service
    .from('spokedu_master_payment_orders')
    .update({ status: 'processing', last_error_code: null })
    .eq('order_id', input.orderId)
    .in('status', ['pending', 'failed', 'recoverable_failed'])
    .select('order_id')
    .maybeSingle();

  if (error) return { claimed: false, error };
  if (claimed) return { claimed: true, error: null };

  const { data: staleClaimed, error: staleError } = await input.service
    .from('spokedu_master_payment_orders')
    .update({ status: 'processing', last_error_code: null })
    .eq('order_id', input.orderId)
    .eq('status', 'processing')
    .lt('updated_at', staleProcessingCutoffIso())
    .select('order_id')
    .maybeSingle();

  if (staleError) return { claimed: false, error: staleError };
  return { claimed: Boolean(staleClaimed), error: null };
}

export async function markSpokeduMasterBillingOrderFailed(input: {
  service: ServiceClient;
  orderId: string;
  lastErrorCode: string;
  paymentKey?: string | null;
  recoverable?: boolean;
}): Promise<void> {
  const patch: Record<string, unknown> = {
    status: input.recoverable ? 'recoverable_failed' : 'failed',
    last_error_code: input.lastErrorCode,
  };
  if (input.paymentKey) patch.payment_key = input.paymentKey;

  await input.service
    .from('spokedu_master_payment_orders')
    .update(patch)
    .eq('order_id', input.orderId);
}

/**
 * 이미 청구된 payment_key가 있으면 재청구하지 않고 apply만 재시도한다.
 */
export function shouldReapplySpokeduMasterBillingOrder(
  order: Pick<SpokeduMasterBillingOrderClaimRow, 'payment_key'> | null | undefined,
): order is { payment_key: string } {
  return Boolean(order?.payment_key && order.payment_key.trim());
}
