import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(join(process.cwd(), 'app/spokedu-master/spomove', name), 'utf8');
const hub = read('SpomoveHubView.tsx');

describe('SPOMOVE user-friction hardening contracts', () => {
  it('keeps search, URL state and selection semantics explicit', () => {
    expect(hub).toContain('placeholder="SPOMOVE 검색"');
    expect(hub).toContain('화면의 신호를 움직임으로 연결하는 체육활동');
    expect(hub).not.toContain('26개 프로그램 · 72개 활동');
    expect(hub).not.toContain('<br className="hidden sm:block" />');
    expect(hub).toContain('parseSpomoveHubUrlState');
    expect(hub).toContain('serializeSpomoveHubUrlState');
    expect(hub).toContain('setDraftQuery');
    expect(hub).toContain('hydrateSearchFromUrl');
    expect(hub).toContain('type="text"');
    expect(hub).toContain('spellCheck={false}');
    expect(hub).toContain('data-spm-spomove-catalog-family={family.id}');
    expect(hub).not.toContain('활동 선택');
    expect(hub).not.toContain('aria-expanded={filtersOpen}');
    expect(hub).not.toContain('필터 <ChevronDown');
    expect(hub).not.toContain('전체 {familyFiltered.length}개');
    expect(hub).toContain('전체 보기');
    expect(hub).toContain('전체 프로그램 보기');
  });


});
