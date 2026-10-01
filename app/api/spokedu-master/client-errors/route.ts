import { NextResponse } from 'next/server';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';

type ClientErrorPayload = {
  digest?: unknown;
  errorName?: unknown;
  pathname?: unknown;
};

const MAX_BODY_BYTES = 4_096;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_MAX_BUCKETS = 10_000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  return request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function isRateLimited(key: string, now = Date.now()): boolean {
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    if (rateLimitBuckets.size >= RATE_LIMIT_MAX_BUCKETS) {
      for (const [bucketKey, bucket] of rateLimitBuckets) {
        if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
      }
      if (rateLimitBuckets.size >= RATE_LIMIT_MAX_BUCKETS && !rateLimitBuckets.has(key)) return true;
    }
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function readSafeString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return withPrivateNoStore(NextResponse.json({ error: 'Payload too large' }, { status: 413 }));
  }
  if (isRateLimited(getClientKey(request))) {
    return withPrivateNoStore(NextResponse.json({ error: 'Too many requests' }, { status: 429 }));
  }

  let payload: ClientErrorPayload;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return withPrivateNoStore(NextResponse.json({ error: 'Payload too large' }, { status: 413 }));
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return withPrivateNoStore(NextResponse.json({ error: 'Invalid payload' }, { status: 400 }));
    }
    payload = parsed as ClientErrorPayload;
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }));
  }

  await reportError(new Error('Client runtime error'), {
    context: 'spokedu_master.client',
    tags: {
      source: 'error_boundary',
      digest: readSafeString(payload.digest),
      errorName: readSafeString(payload.errorName),
      pathname: readSafeString(payload.pathname, 200),
    },
  });

  return withPrivateNoStore(new NextResponse(null, { status: 204 }));
}
