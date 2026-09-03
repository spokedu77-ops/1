import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync('app/spokedu-master/dashboard/DashboardView.tsx', 'utf8');
const lessonCard = readFileSync('app/spokedu-master/components/lesson/LessonCatalogCard.tsx', 'utf8');
const followUp = readFileSync('app/spokedu-master/components/information/SystemDecisionBanner.tsx', 'utf8');

describe('MASTER Home content card system', () => {
  it('uses the Library card grammar for the four Weekly picks', () => {
    expect(lessonCard).toContain("const mediaAspect = 'aspect-[4/3]'");
    expect(lessonCard).not.toContain("h-[345px] min-h-[345px]");
    expect(dashboard).toContain('variant="home"');
    expect(dashboard).toContain('WEEKLY_RECOMMENDATION_COUNT = 4');
  });

  it('keeps one mobile Weekly rail and presents four SPOMOVE discovery entries for every plan', () => {
    expect(dashboard.match(/w-\[82vw\] max-w-\[340px\]/g)).toHaveLength(2);
    expect(dashboard).toContain('snap-mandatory');
    expect(dashboard).toContain('data-dashboard-section="spomove-extension"');
    expect(dashboard).toContain('featuredSpomove.slice(0, 4)');
    expect(dashboard).not.toContain('<Play');
  });

  it('keeps urgent follow-up compact with a touch-safe action instead of rendering a Home hero', () => {
    expect(followUp).toContain('px-3 py-2.5');
    expect(followUp).toContain('min-h-11');
    expect(followUp).not.toContain('sm:p-5');
  });

  it('reports recoverable Weekly slot diagnostics as warnings instead of runtime errors', () => {
    expect(dashboard).toContain("console.warn('[SPOKEDU MASTER] Weekly recommendation slot diagnostics.'");
    expect(dashboard).not.toContain("console.error('[SPOKEDU MASTER] Weekly recommendation slot diagnostics.'");
  });
});
