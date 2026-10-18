import { describe, expect, it } from 'vitest';
import { isHoneypotTripped, rateLimitToResponse, readHoneypot } from './publicLeadSpamGuard';

describe('publicLeadSpamGuard', () => {
  it('honeypot empty passes', () => {
    expect(readHoneypot({ website: '' })).toBe('');
    expect(isHoneypotTripped({ website: '' })).toBe(false);
  });

  it('honeypot filled trips', () => {
    expect(isHoneypotTripped({ website: 'http://spam.test' })).toBe(true);
  });

  it('rateLimitToResponse returns 429 with Retry-After', () => {
    const res = rateLimitToResponse({ status: 'limited', retryAfterSec: 3600 });
    expect(res?.status).toBe(429);
    expect(res?.headers.get('Retry-After')).toBe('3600');
  });

  it('rateLimitToResponse returns 503 when misconfigured', () => {
    const res = rateLimitToResponse({ status: 'misconfigured', reason: 'rpc_missing' });
    expect(res?.status).toBe(503);
  });
});
