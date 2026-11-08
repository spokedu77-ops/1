import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFieldRecordSameOrigin } from './request-origin';
const request = (origin: string, host?: string, extra?: Record<string, string>) => new Request('http://127.0.0.1:3000/api/admin/field-records/seed', { method: 'POST', headers: { origin, ...(host ? { host } : {}), ...extra } });
afterEach(() => vi.unstubAllEnvs());
describe('field record request origin', () => {
  it('accepts localhost when Next uses its internal loopback bind URL', () => {
    expect(isFieldRecordSameOrigin(request('http://localhost:3000', 'localhost:3000'))).toBe(true);
    expect(isFieldRecordSameOrigin(request('http://127.0.0.1:3000', '127.0.0.1:3000'))).toBe(true);
  });
  it('allows same-port loopback aliases only in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isFieldRecordSameOrigin(request('http://localhost:3000'))).toBe(true);
    expect(isFieldRecordSameOrigin(request('http://[::1]:3000'))).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(isFieldRecordSameOrigin(request('http://localhost:3000'))).toBe(false);
  });
  it.each(['http://localhost:3001', 'https://localhost:3000', 'http://localhost.evil.test:3000', 'https://other.example', 'null', 'file:///', 'http://localhost:3000/path'])('rejects foreign or malformed origin %s', origin => {
    expect(isFieldRecordSameOrigin(request(origin))).toBe(false);
  });
  it('does not trust a spoofed forwarded host', () => {
    expect(isFieldRecordSameOrigin(request('https://other.example', undefined, { 'x-forwarded-host': 'other.example' }))).toBe(false);
  });
  it('rejects cross-site browser requests even when Origin is omitted or forged', () => {
    expect(isFieldRecordSameOrigin(request('http://127.0.0.1:3000', undefined, { 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });
});
