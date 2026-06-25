import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/programs/route.ts'),
  'utf8',
);

describe('SPOKEDU MASTER program PATCH authorization contract', () => {
  it('uses the shared admin helper for 401 and 403 responses', () => {
    expect(source).toContain('const admin = await requireAdmin()');
    expect(source).toContain('if (!admin.ok) return withPrivateNoStore(admin.response)');
  });

  it('finishes administrator verification before creating a service-role client', () => {
    const adminCheck = source.indexOf('const admin = await requireAdmin()');
    const patchStart = source.indexOf('export async function PATCH');
    const serviceRole = source.indexOf('const supabase = getServiceSupabase()', patchStart);
    expect(adminCheck).toBeGreaterThan(patchStart);
    expect(serviceRole).toBeGreaterThan(adminCheck);
  });

  it('returns 400 for an empty allowed-field patch', () => {
    expect(source).toContain('if (Object.keys(patch).length === 0)');
    expect(source).toContain("return privateNoStoreJson({ error: 'empty patch' }, { status: 400 })");
  });

  it('ignores fields outside the explicit allowlist', () => {
    expect(source).toContain('const allowed = [');
    expect(source).toContain('if (key in body) patch[key] = body[key]');
    expect(source).not.toContain('...body');
  });

  it('keeps GET protected by MASTER access rather than admin-only access', () => {
    const getBlock = source.slice(
      source.indexOf('export async function GET'),
      source.indexOf('export async function PATCH'),
    );
    expect(getBlock).toContain('requireSpokeduMasterAccess()');
    expect(getBlock).not.toContain('requireAdmin()');
  });
});
