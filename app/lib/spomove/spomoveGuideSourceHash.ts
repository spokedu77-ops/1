/**
 * Stable stringify + short hash for SPOMOVE guide source fingerprints.
 * Browser-safe (no Node crypto). Deterministic key order.
 */

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const next: Record<string, unknown> = {};
  for (const key of keys) {
    const v = obj[key];
    if (v === undefined) continue;
    next[key] = sortKeys(v);
  }
  return next;
}

/** FNV-1a 32-bit → hex (compact, deterministic). */
export function hashStableString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function hashStableValue(value: unknown): string {
  return hashStableString(stableStringify(value));
}
