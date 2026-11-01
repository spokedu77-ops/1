/** Phase C0 — off by default; set `NEXT_PUBLIC_SPOKEDU_STITCH_C0=1` locally to preview Stitch pages on public routes. */
export const STITCH_C0_PUBLIC_PATHS = [
  '/',
  '/education',
  '/private',
  '/spomove',
  '/records',
  '/about',
] as const;

export type StitchC0PublicPath = (typeof STITCH_C0_PUBLIC_PATHS)[number];

export function isStitchC0Enabled(): boolean {
  return process.env.NEXT_PUBLIC_SPOKEDU_STITCH_C0 === '1';
}

export function isStitchC0Path(pathname: string): boolean {
  if (pathname === '/') return true;
  return STITCH_C0_PUBLIC_PATHS.some((p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)));
}
