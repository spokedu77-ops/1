import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('typed item-level Favorites API', () => {
  it('uses typed item-level mutations with owner isolation', () => {
    const route = read('app/api/spokedu-master/favorites/route.ts');
    expect(route).toContain('export async function GET');
    expect(route).toContain('export async function POST');
    expect(route).toContain('export async function DELETE');
    expect(route).not.toContain('export async function PUT');
    expect(route.match(/\.eq\('owner_id', access\.userId\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(route).toContain(".eq('content_type', ref.type)");
    expect(route).toContain(".eq('program_id', ref.id)");
    expect(route).toContain("insertError.code !== '23505'");
  });

  it('keeps the legacy whole-set endpoint out of canonical UI writers', () => {
    const store = read('app/spokedu-master/store/index.ts');
    expect(store).toContain("fetch('/api/spokedu-master/favorites'");
    expect(store).not.toContain("fetch('/api/spokedu-master/program-favorites'");
    expect(store).not.toContain("method: 'PUT'");
  });
});
