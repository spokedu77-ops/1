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

  it('exposes class tools from execution and preparation contexts', () => {
    const classMode = read('app/spokedu-master/components/ui/ClassModeView.tsx');
    const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');

    expect(classMode).toContain('/spokedu-master/class-tools?returnTo=');
    expect(classMode).toContain('href={classToolsHref}');
    expect(classMode).toContain('target="_blank"');
    expect(classMode).toContain('rel="noreferrer"');
    expect(detail).toContain('/spokedu-master/class-tools?returnTo=');
    expect(detail).toContain('href={classToolsHref}');
  });

  it('allows returning only to lesson execution or detail contexts from class tools', () => {
    const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');

    expect(tools).toContain("returnTo?.startsWith('/spokedu-master/class-mode/')");
    expect(tools).toContain("returnTo?.startsWith('/spokedu-master/library/')");
    expect(tools).toContain('classContextReturnHref');
    expect(tools).toContain('classContextReturnLabel');
    expect(tools).toContain('수업 실행으로 돌아가기');
    expect(tools).toContain('전체 수업 자료로 돌아가기');
    expect(tools).not.toContain('window.location.href');
  });
});
