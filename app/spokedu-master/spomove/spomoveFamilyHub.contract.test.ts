import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const hub = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/SpomoveHubView.tsx'), 'utf8');

describe('SPOMOVE Family-first Hub', () => {
  it('leads with explicit Catalog Families instead of the preset filter wall', () => {
    expect(hub).toContain('SPOMOVE_CATALOG_FAMILIES');
    expect(hub).toContain('data-spm-spomove-catalog-family={family.id}');
    expect(hub).toContain('SPOMOVE 프로그램');
    expect(hub).not.toContain('PROGRAM_GROUP_TABS.map');
  });

  it('lets a direct search bypass the selected Family', () => {
    expect(hub).toContain("family: nextQuery ? 'all' : urlState.family");
    expect(hub).toContain('filterPresetsByCatalogFamily(visiblePresets, selectedFamilyId)');
  });

  it('keeps detailed filters behind disclosure and card actions preparation-led', () => {
    expect(hub).toContain('aria-expanded={filtersOpen}');
    expect(hub).toContain('활동 준비');
    expect(hub).toContain('시작 설정');
    expect(hub).not.toContain('바로 실행');
    expect(hub).not.toContain('바로 시작');
  });

  it('uses content color in previews and neutral chrome around Families', () => {
    expect(hub).toContain('<SpomoveProgramVisual preset={representative} />');
    expect(hub).not.toContain('AXIS_ACCENT');
    expect(hub).toContain('card.badges.slice(0, 2)');
  });
});
