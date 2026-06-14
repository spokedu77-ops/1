import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('SPOKEDU MASTER payment webhook', () => {
  it('returns an explicit not-configured response instead of success', async () => {
    const response = await POST();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(501);
    expect(body).toEqual({
      error: 'Webhook is not configured',
      code: 'WEBHOOK_NOT_CONFIGURED',
    });
    expect(body).not.toHaveProperty('ok');
  });

  it('does not import or call database clients', () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        'app/api/spokedu-master/payment/webhook/route.ts',
      ),
      'utf8',
    );

    expect(source).not.toMatch(/supabase|service role|getServiceSupabase/i);
    expect(source).not.toMatch(/\.from\(|\.insert\(|\.update\(|\.upsert\(/);
    expect(source).not.toContain('request.json');
  });
});
