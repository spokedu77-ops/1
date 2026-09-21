import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER TabBar clearance architecture', () => {
  it('does not render TabBar on login chrome-hidden routes', () => {
    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
    expect(shell).toContain('const isLogin = pathname === `${basePath}/login`');
    expect(shell).toContain('isProgramsEditor || isLogin');
    expect(shell).toContain('{hideChrome ? null : <TabBar basePath={basePath} snapshot={accessGuard.snapshot} />}');
  });

  it('renders a fixed TabBar for authenticated mobile chrome', () => {
    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
    const tabBar = read('app/spokedu-master/components/layout/TabBar.tsx');
    expect(shell).toContain('{hideChrome ? null : <TabBar');
    expect(tabBar).toContain('data-spm-tabbar="true"');
    expect(tabBar).toContain('fixed inset-x-0 bottom-0');
    expect(tabBar).toContain('lg:hidden');
  });

  it('reserves shared TabBar + safe-area clearance on authenticated main content', () => {
    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
    const metrics = read('app/spokedu-master/components/layout/tabBarMetrics.ts');
    const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');
    const library = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
    expect(metrics).toContain('calc(70px + max(8px, env(safe-area-inset-bottom, 0px)))');
    expect(shell).toContain('pb-[var(--spm-tabbar-clearance)] lg:pb-0');
    expect(tools).not.toContain('pb-[86px]');
    expect(tools).toContain('min-h-0 flex-1 overflow-y-auto overscroll-contain');
    expect(library).toContain('max-lg:bottom-[var(--spm-tabbar-clearance,0px)]');
  });
});
