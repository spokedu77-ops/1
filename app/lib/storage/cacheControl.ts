export const MUTABLE_STORAGE_CACHE_SECONDS = '3600';
export const IMMUTABLE_STORAGE_CACHE_SECONDS = '31536000';

/**
 * Only long-cache paths whose filename is versioned at creation time.
 * Stable paths remain on the existing one-hour policy so replacing an asset
 * keeps working for clients that do not append a version query parameter.
 */
export function resolveStorageCacheControl(path: string): string {
  const normalized = path.trim().replace(/^\/+/, '');
  const immutablePath =
    /^(?:notices|weekly_best)\/\d{13}_[a-z0-9]+\.[a-z0-9]+$/i.test(normalized)
    || /^curriculum\/center-equipment\/recompressed-\d{13}\.[a-z0-9]+$/i.test(normalized)
    || /^spokedu-master\/programs\/[^/]+\/setup-\d{13}\.[a-z0-9]+$/i.test(normalized);

  return immutablePath ? IMMUTABLE_STORAGE_CACHE_SECONDS : MUTABLE_STORAGE_CACHE_SECONDS;
}
