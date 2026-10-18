import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

/** 1 hour window */
export const PUBLIC_LEAD_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const PUBLIC_LEAD_RATE_LIMIT_MAX = 12;

export type PublicLeadRateLimitResult =
  | { status: 'allow' }
  | { status: 'limited'; retryAfterSec: number }
  | { status: 'misconfigured'; reason: 'rpc_missing' | 'rpc_error' };

export function getTrustedClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return 'unknown';
}

export function readHoneypot(body: Record<string, unknown>, field = 'website'): string {
  const raw = body[field];
  return typeof raw === 'string' ? raw.trim() : '';
}

/** Silent accept for bots filling hidden fields. */
export function isHoneypotTripped(body: Record<string, unknown>): boolean {
  return readHoneypot(body).length > 0;
}

function isRpcMissingError(error: { code?: string; message?: string }): boolean {
  if (error.code === 'PGRST202') return true;
  const msg = error.message ?? '';
  return msg.includes('public_lead_rate_limit_check') || msg.includes('Could not find the function');
}

async function evaluateRateLimitDb(bucket: string, now: number): Promise<PublicLeadRateLimitResult> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc('public_lead_rate_limit_check', {
      p_bucket: bucket,
      p_window_ms: PUBLIC_LEAD_RATE_LIMIT_WINDOW_MS,
      p_max: PUBLIC_LEAD_RATE_LIMIT_MAX,
      p_now_ms: now,
    });
    if (error) {
      if (isRpcMissingError(error)) {
        return { status: 'misconfigured', reason: 'rpc_missing' };
      }
      console.error('[publicLeadSpamGuard] rpc error', error.code);
      return { status: 'misconfigured', reason: 'rpc_error' };
    }
    if (data === false) {
      return { status: 'limited', retryAfterSec: Math.ceil(PUBLIC_LEAD_RATE_LIMIT_WINDOW_MS / 1000) };
    }
    return { status: 'allow' };
  } catch {
    return { status: 'misconfigured', reason: 'rpc_error' };
  }
}

/**
 * Production requires Supabase RPC `public_lead_rate_limit_check` (migration 20261018120000).
 * No in-memory fallback in production — misconfigured backend blocks lead intake (503).
 */
export async function evaluatePublicLeadRateLimit(
  req: NextRequest,
  routeKey: string,
): Promise<PublicLeadRateLimitResult> {
  if (process.env.NODE_ENV !== 'production') {
    return { status: 'allow' };
  }
  const ip = getTrustedClientIp(req);
  if (ip === 'unknown') {
    return { status: 'misconfigured', reason: 'rpc_error' };
  }
  const bucket = `${routeKey}:${ip}`;
  return evaluateRateLimitDb(bucket, Date.now());
}

/** @deprecated use evaluatePublicLeadRateLimit + rateLimitToResponse */
export async function isPublicLeadRateLimited(req: NextRequest, routeKey: string): Promise<boolean> {
  const r = await evaluatePublicLeadRateLimit(req, routeKey);
  return r.status === 'limited';
}

export function rateLimitToResponse(result: PublicLeadRateLimitResult): NextResponse | null {
  if (result.status === 'allow') return null;
  if (result.status === 'limited') {
    return NextResponse.json(
      { ok: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      {
        status: 429,
        headers: { 'Retry-After': String(result.retryAfterSec) },
      },
    );
  }
  return NextResponse.json(
    {
      ok: false,
      message: '문의 접수 보호 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.',
      code: 'rate_limit_backend_unconfigured',
    },
    { status: 503 },
  );
}
