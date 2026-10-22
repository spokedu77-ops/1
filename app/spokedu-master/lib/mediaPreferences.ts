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

/**
 * Remote hosts that may use Vercel /_next/image.
 * Public Supabase Storage URLs load directly (unoptimized): Vercel Image
 * Optimization can return 402 when quota/billing blocks transforms, which
 * breaks every LAB thumbnail while Storage itself still serves 200.
 * Signed/authenticated URLs stay direct because tokens are request-specific.
 * Keep in sync with next.config.ts images.remotePatterns.
 */
export function canOptimizeRemoteImage(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return true;
  try {
    const host = new URL(src).hostname;
    if (host === 'supabase.co' || host.endsWith('.supabase.co')) {
      return false;
    }
    return host === 'img.youtube.com' || host === 'i.postimg.cc';
  } catch {
    return false;
  }
}

/** Pass as next/image `unoptimized` — bypasses Vercel Image Optimization for direct remote URLs. */
export function nextImageUnoptimized(src: string): boolean {
  return /^https?:\/\//i.test(src) && !canOptimizeRemoteImage(src);
}
