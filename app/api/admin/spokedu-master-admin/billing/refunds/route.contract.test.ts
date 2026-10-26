import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const routePath = join(dirname(fileURLToPath(import.meta.url)), 'route.ts');

describe('admin billing refunds route contract', () => {
  it('requires admin and keeps PG execution out of the route', () => {
    const route = readFileSync(routePath, 'utf8');
    expect(route).toContain('requireAdmin');
    expect(route).not.toMatch(/toss|payment_key|billing_key/i);
    expect(route).toContain('createRefundRequestRecord');
    expect(route).toContain('transitionRefundRequestRecord');
  });
});
