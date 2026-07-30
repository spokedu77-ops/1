import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const programsPage = read('app/admin/spokedu-master/programs/page.tsx');
const spomovePage = read('app/admin/spokedu-master/spomove/page.tsx');
const sidebar = read('app/components/Sidebar.tsx');

describe('admin SPOKEDU MASTER split contract', () => {
  it('splits library and SPOMOVE admin entry points', () => {
    expect(sidebar).not.toContain('스포키듀 구독 NEW');
    expect(sidebar).toContain('마스터 라이브러리');
    expect(sidebar).toContain('/admin/spokedu-master/programs');
    expect(sidebar).toContain('마스터 스포무브');
    expect(sidebar).toContain('/admin/spokedu-master/spomove');
    expect(spomovePage).toContain("from '../programs/page'");
  });

  it('keeps SPOMOVE editing in its own admin mode', () => {
    expect(programsPage).toContain('LIBRARY_ADMIN_TAB_OPTIONS');
    expect(programsPage).toContain('SPOMOVE_ADMIN_TAB_OPTIONS');
    expect(programsPage).toContain("pathname.startsWith('/admin/spokedu-master/spomove')");
    expect(programsPage).toContain('SpomoveContentManager');
    expect(programsPage).toContain('SPOMOVE_CONTENT_PACK_ID');
    expect(programsPage).toContain('핵심 키워드');
    expect(programsPage).toContain('활동방법');
    expect(programsPage).toContain('활동 개념');
  });
});
