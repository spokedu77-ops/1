import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('program favorites server sync contracts', () => {
  it('stores favorites through the server API instead of direct client writes', () => {
    const route = read('app/api/spokedu-master/program-favorites/route.ts');
    expect(route).toContain("requireSpokeduMasterAccess");
    expect(route).toContain("getServiceSupabase");
    expect(route).toContain("spokedu_master_program_favorites");
    expect(route).not.toContain('createServerSupabaseClient');
  });

  it('loads and merges favorites when entitled content is available', () => {
    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
    expect(shell).toContain('syncFavoriteProgramsFromServer');
    expect(shell).toContain('void syncFavoriteProgramsFromServer()');
  });

  it('pushes favorite changes after local toggle', () => {
    const store = read('app/spokedu-master/store/index.ts');
    expect(store).toContain('syncFavoriteProgramsFromServer');
    expect(store).toContain("fetch('/api/spokedu-master/program-favorites'");
    expect(store).toContain('pushFavoriteProgramsToServer');
  });
});
