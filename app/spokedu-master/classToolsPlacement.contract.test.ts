import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER class tools placement', () => {
  it('keeps class tools out of discovery entry points', () => {
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const library = read('app/spokedu-master/library/LibraryView.tsx');
    const preview = read('app/spokedu-master/components/lesson/ProgramPreviewModal.tsx');

    expect(dashboard).not.toContain('/spokedu-master/class-tools');
    expect(library).not.toContain('/spokedu-master/class-tools');
    expect(preview).not.toContain('/spokedu-master/class-tools');
  });

  it('adds class tools to primary navigation', () => {
    const statusBar = read('app/spokedu-master/components/layout/StatusBar.tsx');
    const tabBar = read('app/spokedu-master/components/layout/TabBar.tsx');
    const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');

    expect(statusBar).toContain('/spokedu-master/class-tools');
    expect(tabBar).toContain("key: 'class-tools'");
    expect(detail).not.toContain('/spokedu-master/class-tools');
  });

  it('ClassToolsView operates as standalone tool without lesson context', () => {
    const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');

    expect(tools).not.toContain('returnTo');
    expect(tools).not.toContain('classContextReturnHref');
    expect(tools).not.toContain('전체 수업 자료로 돌아가기');
    expect(tools).not.toContain("returnTo?.startsWith('/spokedu-master/class-mode/')");
    expect(tools).not.toContain("returnTo?.startsWith('/spokedu-master/library/')");
    expect(tools).not.toContain('window.location.href');
  });
});
