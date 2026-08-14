import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./useTeacherMaterialsAccess.ts', import.meta.url), 'utf8');

describe('teacher materials access identity isolation', () => {
  it('does not cache an authorization decision without a user identity', () => {
    expect(source).not.toContain('memCache');
    expect(source).not.toContain('CACHE_TTL_MS');
    expect(source).not.toContain('writeStorageCache');
    expect(source).toContain("fetch('/api/auth/check-teacher-materials'");
  });

  it('removes legacy cross-user cache data before checking', () => {
    expect(source).toContain('sessionStorage.removeItem(STORAGE_KEY)');
  });
});
