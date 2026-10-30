import { randomUUID } from 'node:crypto';

/** Server-side idempotency keys for equipment RPCs (16–128 chars). */
export function newEquipmentRequestKey(prefix = 'eq'): string {
  return `${prefix}-${randomUUID()}`.slice(0, 128);
}

export function normalizeClientRequestKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 16 || trimmed.length > 128) return null;
  return trimmed;
}
