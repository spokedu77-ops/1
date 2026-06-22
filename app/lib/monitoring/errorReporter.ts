import { devLogger } from '@/app/lib/logging/devLogger';

type SafeTagValue = string | number | boolean | null | undefined;

export type ErrorReportTags = Record<string, SafeTagValue>;

type ReportErrorInput = {
  context: string;
  tags?: ErrorReportTags;
};

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|token|secret|service.*role|cookie|authorization|auth|body|payload|memo|student|explanation|text|email|paymentkey|orderid|key)/i;

function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function errorName(error: unknown): string {
  if (error instanceof Error && error.name) return error.name;
  return typeof error;
}

function errorFingerprint(error: unknown): string {
  if (error instanceof Error) {
    return stableHash(`${error.name}:${error.message}`);
  }
  return stableHash(String(error));
}

function sanitizeTags(tags: ErrorReportTags | undefined): Record<string, string | number | boolean | null> {
  const safeTags: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(tags ?? {})) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (value === undefined) continue;
    if (value === null || typeof value === 'boolean' || typeof value === 'number') {
      safeTags[key] = value;
      continue;
    }
    safeTags[key] = value.length > 120 ? `${value.slice(0, 117)}...` : value;
  }
  return safeTags;
}

export function hashForMonitoring(value: string | null | undefined): string | null {
  if (!value) return null;
  return stableHash(value);
}

export async function reportError(error: unknown, input: ReportErrorInput): Promise<void> {
  const payload = {
    service: 'spokedu-master',
    context: input.context,
    environment: process.env.NODE_ENV ?? 'unknown',
    errorName: errorName(error),
    errorHash: errorFingerprint(error),
    tags: sanitizeTags(input.tags),
    occurredAt: new Date().toISOString(),
  };

  const webhookUrl = process.env.SPOKEDU_MONITORING_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    devLogger.error('[monitoring]', payload);
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch (reporterError) {
    devLogger.error('[monitoring] reporter failed', reporterError);
  }
}
