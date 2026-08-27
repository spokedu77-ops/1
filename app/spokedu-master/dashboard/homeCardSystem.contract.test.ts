import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync('app/spokedu-master/dashboard/DashboardView.tsx', 'utf8');
const lessonCard = readFileSync('app/spokedu-master/components/lesson/LessonCatalogCard.tsx', 'utf8');
const followUp = readFileSync('app/spokedu-master/components/information/SystemDecisionBanner.tsx', 'utf8');

describe('MASTER Home content card system', () => {
  it('locks Library and SPOMOVE to one outer, metadata, and CTA geometry', () => {
    expect(lessonCard).toContain("const cardGeometry = 'h-[345px] min-h-[345px]'");
    expect(dashboard).toContain('h-[345px] min-h-[345px]');
    expect(lessonCard).toContain('h-[88px] shrink-0');
    expect(dashboard).toContain('h-[88px] shrink-0');
    expect(lessonCard).toContain('flex h-5 min-w-0 items-center overflow-hidden');
    expect(dashboard).toContain('flex h-5 min-w-0 items-center overflow-hidden');
    expect(lessonCard).toContain('inline-flex h-9 w-full items-center justify-between');
    expect(dashboard).toContain('inline-flex h-9 w-full items-center justify-between');
  });

  it('uses the same responsive rail width and does not imply SPOMOVE video playback', () => {
    expect(dashboard.match(/w-\[78vw\] max-w-\[310px\]/g)).toHaveLength(2);
    const spomoveCard = dashboard.slice(dashboard.indexOf('function SpomoveCard'), dashboard.indexOf('function ActivityPanel'));
    expect(spomoveCard).not.toContain('<Play');
    expect(spomoveCard).toContain('활동 준비');
  });

  it('keeps urgent follow-up compact instead of rendering a Home hero', () => {
    expect(followUp).toContain('px-3 py-2.5');
    expect(followUp).toContain('min-h-9');
    expect(followUp).not.toContain('sm:p-5');
  });
});
