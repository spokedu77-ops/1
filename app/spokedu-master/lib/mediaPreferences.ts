/**
 * Low-end / constrained-network media helpers for SPOKEDU MASTER.
 * Prefer lighter thumbnails, smaller pages, and deferred video embeds.
 */

type NetworkConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

function getConnection(): NetworkConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkConnection }).connection;
}

/** Save-Data / 2G — use lighter thumbnails and smaller list pages. */
export function preferLiteMedia(): boolean {
  const conn = getConnection();
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g';
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Hosts allowed by next.config.ts images.remotePatterns (keep in sync). */
export function canOptimizeRemoteImage(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return true;
  try {
    const host = new URL(src).hostname;
    return (
      host === 'img.youtube.com' ||
      host === 'i.postimg.cc' ||
      host === 'supabase.co' ||
      host.endsWith('.supabase.co')
    );
  } catch {
    return false;
  }
}
