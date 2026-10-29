import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const shell = readFileSync(join(process.cwd(), 'app/spokedu-master/components/layout/AppShell.tsx'), 'utf8');

describe('AppShell tab navigation perf guards', () => {
  it('uses cached home program load on route change and defers forced reload to focus', () => {
    expect(shell).toContain('void loadHomePrograms()');
    expect(shell).toContain('void reloadHomePrograms()');
    expect(shell).toMatch(/pathname === `\$\{activeBasePath\}\/dashboard`[\s\S]*loadHomePrograms\(\)/);
    expect(shell).toContain('syncFavoriteProgramsFromServer({ force: true })');
  });
});
