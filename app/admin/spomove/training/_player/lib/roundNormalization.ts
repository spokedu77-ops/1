export const COLOR_TRACKER_ROUND_OPTIONS = [2, 3, 5, 10] as const;
export const NUMBER_CART_ROUND_OPTIONS = [7, 10, 15, 25] as const;

function normalizeRoundOption(value: number, options: readonly number[], fallback: number): number {
  const n = Math.round(Number.isFinite(value) ? value : fallback);
  if (options.includes(n)) return n;
  return options.reduce((best, option) => (
    Math.abs(option - n) < Math.abs(best - n) ? option : best
  ));
}

export function normalizeColorTrackerRounds(value: number): number {
  return normalizeRoundOption(value, COLOR_TRACKER_ROUND_OPTIONS, 5);
}

export function normalizeNumberCartRounds(value: number): number {
  return normalizeRoundOption(value, NUMBER_CART_ROUND_OPTIONS, 5);
}
