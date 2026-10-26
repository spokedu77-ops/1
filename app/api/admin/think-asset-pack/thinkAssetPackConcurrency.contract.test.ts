import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const routePath = join(dirname(fileURLToPath(import.meta.url)), 'route.ts');

describe('think-asset-pack concurrent save contract', () => {
  it('requires expected updated_at for optimistic conflict detection', () => {
    const route = readFileSync(routePath, 'utf8');
    expect(route).toContain('expected_updated_at');
    expect(route).toContain('.eq(\'updated_at\', expectedUpdatedAt)');
    expect(route).not.toMatch(/existing\.updated_at\s*!==\s*expectedUpdatedAt/);
    expect(route).toContain('status: 409');
    expect(route).toContain("conflict: true");
  });
});
