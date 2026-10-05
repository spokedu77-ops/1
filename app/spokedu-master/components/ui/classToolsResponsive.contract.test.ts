import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('app/spokedu-master/components/ui/ClassToolsView.tsx', 'utf8');

describe('MASTER Class Tools responsive contract', () => {
  it('keeps all eight tools on screen without a scrolling tab strip', () => {
    expect(source).toContain('grid-cols-4');
    expect(source).toContain('min-[768px]:grid-cols-8');
    expect(source).toContain('min-[1200px]:flex-wrap');
    expect(source).toContain('min-[1200px]:justify-center');
    expect(source).toContain('data-class-tools-tabs data-class-tools-dock className="grid shrink-0');
    expect(source).toContain('gap-1 overflow-hidden border-b');
    expect(source).not.toContain('scrollIntoView');
  });

  it('fits the scoreboard by measured columns instead of auto-fit', () => {
    expect(source).not.toContain('repeat(auto-fit');
    expect(source).toContain('fittedColumnCount(teamCount, width, height');
    expect(source).toContain('gridColumnsClass(columns)');
  });

  it('reflows tournament rounds and gives dense ladders a contained scroll area', () => {
    expect(source).toContain('fittedColumnCount(Math.max(1, bracket.rounds.length)');
    expect(source).not.toContain('data-tournament-scroll');
    expect(source).toContain('data-ladder-scroll');
    expect(source).toContain('students.length * 56');
    expect(source).not.toContain('좌우로 밀어 다음 대진을 확인하세요.');
    expect(source).toContain('preserveAspectRatio="none"');
  });

  it('keeps the ladder modal accessible and inside the viewport', () => {
    expect(source).toContain('role="dialog" aria-modal="true"');
    expect(source).toContain('aria-labelledby="ladder-result-title"');
    expect(source).toContain('max-h-[calc(100dvh-2rem)]');
    expect(source).toContain('aria-label="결과 요약 닫기"');
    expect(source).toContain('h-11 w-11');
    expect(source).toContain('max-h-[calc(100dvh-2rem)]');
  });

  it('relies on AppShell for mobile tab-bar clearance', () => {
    expect(source).not.toContain('pb-28');
  });
});
