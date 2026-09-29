import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/spokedu-master/components/ui/ClassToolsView.tsx', 'utf8');

describe('MASTER Class Tools responsive contract', () => {
  it('keeps all eight tools in the mobile 4 by 2 selector through 767px', () => {
    expect(source).toContain('grid-cols-4');
    expect(source).toContain('md:flex');
    expect(source).toContain('md:overflow-x-auto');
    expect(source).toContain('min-[1200px]:justify-center');
    expect(source).toContain('scrollIntoView');
    expect(source).not.toContain('sm:overflow-x-auto');
  });

  it('uses explicit scoreboard compositions instead of auto-fit', () => {
    expect(source).not.toContain('repeat(auto-fit');
    expect(source).toContain("teamCount === 5 ? 'grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-5'");
    expect(source).toContain("teamCount === 5 && index === 4 ? 'col-span-2 md:col-span-1'");
  });

  it('limits horizontal scrolling to the tournament and ladder canvases', () => {
    expect(source).toContain('data-tournament-scroll');
    expect(source).toContain('data-ladder-scroll');
    expect(source).toContain('좌우로 밀어 다음 대진을 확인하세요.');
  });

  it('keeps the ladder modal accessible and internally scrollable', () => {
    expect(source).toContain('role="dialog" aria-modal="true"');
    expect(source).toContain('aria-labelledby="ladder-result-title"');
    expect(source).toContain('max-h-[calc(100dvh-2rem)]');
    expect(source).toContain('aria-label="결과 요약 닫기"');
    expect(source).toContain('h-11 w-11');
  });

  it('relies on AppShell for mobile tab-bar clearance', () => {
    expect(source).not.toContain('pb-28');
  });
});
