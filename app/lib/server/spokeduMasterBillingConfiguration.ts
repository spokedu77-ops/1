import { createHash } from 'node:crypto';
import { isTossClientKeyAllowed } from '../../spokedu-master/payment/tossClientKey';

export const SPOKEDU_BILLING_MID = 'bill_spoke95n2';

// An operator pins this digest ONLY after checking both keys under the same
// billing MID in Toss. Key prefixes cannot prove a merchant or contract.
export function billingKeyPairDigest(clientKey: string, secretKey: string): string {
  return createHash('sha256').update(`${SPOKEDU_BILLING_MID}\n${clientKey}\n${secretKey}`).digest('hex');
}

export function getBillingKeyFormatError(clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() ?? ''): string | null {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim() ?? '';
  if (!isTossClientKeyAllowed(clientKey, process.env.NODE_ENV, process.env.VERCEL_ENV)) return 'billing_client_key_invalid';
  if (!/^(test|live)_sk_[A-Za-z0-9]+$/.test(secretKey)) return 'billing_secret_key_invalid';
  if (clientKey.split('_')[0] !== secretKey.split('_')[0]) return 'billing_key_mode_mismatch';
  return null;
}

export function getBillingConfigurationError(clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() ?? ''): string | null {
  const formatError = getBillingKeyFormatError(clientKey);
  if (formatError) return formatError;
  const secretKey = process.env.TOSS_SECRET_KEY?.trim() ?? '';
  if (process.env.TOSS_BILLING_MID !== SPOKEDU_BILLING_MID) return 'billing_mid_unverified';
  if (process.env.TOSS_BILLING_KEY_PAIR_SHA256 !== billingKeyPairDigest(clientKey, secretKey)) return 'billing_key_pair_unverified';
  return null;
}
