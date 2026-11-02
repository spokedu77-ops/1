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
 * Production requires an explicit opt-in. Local development defaults to the
 * current Stitch surfaces so normal `next dev` displays the files being edited.
 * An explicit `0` keeps the legacy development surface available.
 */
export function isStitchC0Enabled(): boolean {
  const configured = process.env.NEXT_PUBLIC_SPOKEDU_STITCH_C0;
  return configured === '1'
    || (process.env.NODE_ENV === 'development' && configured !== '0');
}

export function isStitchC0Path(pathname: string): boolean {
  return STITCH_C0_EXACT.has(pathname);
}
