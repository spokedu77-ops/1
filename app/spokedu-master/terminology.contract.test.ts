import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const USER_VISIBLE_FILES = [
  'app/spokedu-master/page.tsx',
  'app/spokedu-master/dashboard/DashboardView.tsx',
  'app/spokedu-master/library/page.tsx',
  'app/spokedu-master/library/LibraryView.tsx',
  'app/spokedu-master/library/[id]/LibraryDetailView.tsx',
  'app/spokedu-master/class-record/page.tsx',
  'app/spokedu-master/report/page.tsx',
  'app/spokedu-master/spomove/page.tsx',
  'app/spokedu-master/spomove/session/page.tsx',
  'app/spokedu-master/components/ui/ClassModeView.tsx',
  'app/spokedu-master/components/ui/ClassToolsView.tsx',
  'app/spokedu-master/components/ui/TrialGateWall.tsx',
  'app/spokedu-master/components/layout/StatusBar.tsx',
  'app/spokedu-master/components/layout/TabBar.tsx',
] as const;

const userVisibleSource = () => USER_VISIBLE_FILES.map(read).join('\n');

describe('SPOKEDU MASTER user-facing terminology', () => {
  it('uses the fixed library, preview, detail, record, explanation, and activity terms', () => {
    const source = userVisibleSource();

    expect(source).toContain('라이브러리');
    expect(source).toContain('수업 미리보기');
    expect(source).toContain('전체 수업 자료 보기');
    expect(source).toContain('수업 기록');
    expect(source).toContain('안내문');
    expect(source).toContain('즐겨찾기');
    expect(source).toContain('내 활동·기록');
  });

  it('does not expose deprecated representative terms in the checked user-facing files', () => {
    const source = userVisibleSource();

    expect(source).not.toContain('수업안');
    expect(source).not.toContain('저장 수업');
    expect(source).not.toContain('빠른 미리보기');
    expect(source).not.toContain('목록으로');
    expect(source).not.toContain('학부모 안내');
    expect(source).not.toContain('설명 문구');
    expect(source).not.toContain('프로그램 라이브러리');
    expect(source).not.toContain('수업 라이브러리');
  });

  it('keeps mobile and desktop navigation labels aligned with aria labels', () => {
    const desktop = read('app/spokedu-master/components/layout/StatusBar.tsx');
    const mobile = read('app/spokedu-master/components/layout/TabBar.tsx');

    expect(desktop).toContain("{ href: '/spokedu-master/library', label: '라이브러리'");
    expect(desktop).toContain('aria-label="라이브러리"');
    expect(mobile).toContain("{ key: 'library', label: '라이브러리'");
    expect(mobile).toContain('aria-label={label}');
    expect(mobile).toContain('aria-label="내 활동·기록 메뉴 열기"');
    expect(mobile).toContain('title="내 활동·기록"');
  });

  it('keeps favorite/detail return and SPOMOVE execution links intact', () => {
    const library = read('app/spokedu-master/library/LibraryView.tsx');
    const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
    const spomove = read('app/spokedu-master/spomove/session/page.tsx');

    expect(library).toContain("aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}");
    expect(library).toContain("params.set('view', nextView);");
    expect(detail).toContain('getLibraryReturnHref');
    expect(detail).toContain('라이브러리로');
    expect(spomove).toContain('EngineRouter');
    expect(spomove).toContain('프로그램 선택으로');
  });
});
