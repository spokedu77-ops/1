import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('center feedback weekday tabs', () => {
  it('renders Monday through Sunday and all in one shared tab row', () => {
    expect(source).toContain("const labels = ['월', '화', '수', '목', '금', '토', '일']");
    expect(source).toContain("[{ dayIndex: 'all' as const, label: '전체'");
    expect(source).toContain('grid-cols-8');
  });

  it('uses one selected weekday to replace the shared content area', () => {
    expect(source).toContain("useState<number | 'all'>('all')");
    expect(source).toContain('setSelectedCenterWeekday(item.dayIndex)');
    expect(source).not.toContain('expandedCenterWeekdays');
  });
});
