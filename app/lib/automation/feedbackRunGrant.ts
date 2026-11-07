import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const TTL_MS = 90_000;
const used = new Map<string, number>();

export function resetRunGrantsForTests() {
  used.clear();
}

function secretOrThrow(): string {
  const secret = process.env.AUTOMATION_WORKER_SECRET?.trim() || process.env.SPOKEDU_AUTOMATION_WORKER_SECRET?.trim();
  if (!secret || secret.length < 16) throw new Error('RUN_GRANT_SECRET_MISSING');
  return secret;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function issueRunGrant(jobId: string, now = Date.now()): string {
  const secret = secretOrThrow();
  const payload = Buffer.from(JSON.stringify({
    jobId,
    jti: randomBytes(16).toString('base64url'),
    exp: now + TTL_MS,
  })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyRunGrant(token: string, expectedJobId: string, now = Date.now()):
  | { ok: true; jobId: string; jti: string }
  | { ok: false; code: 'GRANT_MALFORMED' | 'GRANT_FORGED' | 'GRANT_EXPIRED' | 'GRANT_REUSED' | 'GRANT_JOB_MISMATCH' } {
  const secret = secretOrThrow();
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return { ok: false, code: 'GRANT_MALFORMED' };
  const expected = sign(payload, secret);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return { ok: false, code: 'GRANT_FORGED' };
  let parsed: { jobId?: string; jti?: string; exp?: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { jobId?: string; jti?: string; exp?: number };
  } catch {
    return { ok: false, code: 'GRANT_MALFORMED' };
  }
  if (!parsed.jobId || !parsed.jti || typeof parsed.exp !== 'number') return { ok: false, code: 'GRANT_MALFORMED' };
  if (parsed.jobId !== expectedJobId) return { ok: false, code: 'GRANT_JOB_MISMATCH' };
  if (parsed.exp < now) return { ok: false, code: 'GRANT_EXPIRED' };
  if (used.has(parsed.jti)) return { ok: false, code: 'GRANT_REUSED' };
  return { ok: true, jobId: parsed.jobId, jti: parsed.jti };
}

export function commitRunGrant(jti: string, exp = Date.now() + TTL_MS) {
  used.set(jti, exp);
}
