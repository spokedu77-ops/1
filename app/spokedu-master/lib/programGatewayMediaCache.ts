import type { ProgramGatewayMedia } from './programGatewayAssets';

type GatewayCacheEntry = {
  media: ProgramGatewayMedia;
  cacheBust: number | undefined;
  fetchedAt: number;
};

const GATEWAY_CACHE_TTL_MS = 5 * 60_000;
let gatewayCache: GatewayCacheEntry | null = null;

export function readProgramGatewayMediaCache(now = Date.now()) {
  if (!gatewayCache) return null;
  if (now - gatewayCache.fetchedAt > GATEWAY_CACHE_TTL_MS) {
    gatewayCache = null;
    return null;
  }
  return gatewayCache;
}

export function writeProgramGatewayMediaCache(entry: Omit<GatewayCacheEntry, 'fetchedAt'>, now = Date.now()) {
  gatewayCache = { ...entry, fetchedAt: now };
}
