/** Phase C — Stitch 6 public routes (exact paths only; `/records/[slug]` excluded). */
export const STITCH_C0_PUBLIC_PATHS = [
  '/',
  '/education',
  '/private',
  '/spomove',
  '/records',
  '/about',
] as const;

export type StitchC0PublicPath = (typeof STITCH_C0_PUBLIC_PATHS)[number];

const STITCH_C0_EXACT = new Set<string>(STITCH_C0_PUBLIC_PATHS);

/**
 * Production-safe: Stitch is **only** on when `NEXT_PUBLIC_SPOKEDU_STITCH_C0=1` at build/dev start.
 * Unset or `0` → legacy marketing pages on the six routes.
 */
export function isStitchC0Enabled(): boolean {
  return process.env.NEXT_PUBLIC_SPOKEDU_STITCH_C0 === '1';
}

export function isStitchC0Path(pathname: string): boolean {
  return STITCH_C0_EXACT.has(pathname);
}
