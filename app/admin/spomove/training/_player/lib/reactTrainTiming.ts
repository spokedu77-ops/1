export function normalizeReactSpeedSec(speedSec: number): number {
  if (!Number.isFinite(speedSec)) return 1.4;
  return Math.max(0.6, Math.min(6, speedSec));
}

export function speedSecToMs(
  speedSec: number,
  options?: { multiplier?: number; minMs?: number; maxMs?: number },
): number {
  const normalized = normalizeReactSpeedSec(speedSec);
  const multiplier = options?.multiplier ?? 1;
  const minMs = options?.minMs ?? 300;
  const maxMs = options?.maxMs ?? 6000;
  const raw = Math.round(normalized * 1000 * multiplier);
  return Math.max(minMs, Math.min(maxMs, raw));
}
