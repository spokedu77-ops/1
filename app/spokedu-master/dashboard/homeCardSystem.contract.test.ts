import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync('app/spokedu-master/dashboard/DashboardView.tsx', 'utf8');
const lessonCard = readFileSync('app/spokedu-master/components/lesson/LessonCatalogCard.tsx', 'utf8');
const followUp = readFileSync('app/spokedu-master/components/information/SystemDecisionBanner.tsx', 'utf8');

describe('MASTER Home content card system', () => {
  it('uses the Library card grammar for the four Weekly picks', () => {
    expect(lessonCard).toContain("const cardGeometry = 'h-[345px] min-h-[345px]'");
    expect(dashboard).toContain('variant="home"');
    expect(dashboard).toContain('WEEKLY_RECOMMENDATION_COUNT = 4');
  });

  it('keeps one mobile Weekly rail and presents SPOMOVE as a compact Premium extension', () => {
    expect(dashboard.match(/w-\[78vw\] max-w-\[310px\]/g)).toHaveLength(1);
    expect(dashboard).toContain('data-dashboard-section="spomove-extension"');
    expect(dashboard).toContain('featuredSpomove.slice(0, 2)');
    expect(dashboard).not.toContain('<Play');
  });

  it('keeps urgent follow-up compact with a touch-safe action instead of rendering a Home hero', () => {
    expect(followUp).toContain('px-3 py-2.5');
    expect(followUp).toContain('min-h-11');
    expect(followUp).not.toContain('sm:p-5');
  });
});
