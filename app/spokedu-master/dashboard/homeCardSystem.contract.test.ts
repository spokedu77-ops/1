import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync('app/spokedu-master/dashboard/DashboardView.tsx', 'utf8');
const weeklyCard = readFileSync('app/spokedu-master/components/lesson/WeeklyEditorialCard.tsx', 'utf8');
const thumb = readFileSync('app/spokedu-master/components/media/InstructionalThumb.tsx', 'utf8');
const shelf = readFileSync('app/spokedu-master/dashboard/homeSpomoveShelf.ts', 'utf8');
const followUp = readFileSync('app/spokedu-master/components/information/SystemDecisionBanner.tsx', 'utf8');

describe('MASTER Home content card system', () => {
  it('keeps Home weekly as four editorial cards, not Library catalog grammar', () => {
    expect(dashboard).toContain('WEEKLY_RECOMMENDATION_COUNT = 4');
    expect(dashboard).toContain('WeeklyEditorialCard');
    expect(dashboard).toContain('ensureWeeklyRecommendationCount');
    expect(dashboard).not.toContain('variant="home"');
    expect(weeklyCard).toContain('InstructionalThumb');
    expect(thumb).toContain('object-contain object-center');
    expect(thumb).toContain('aspect-[4/3] w-full');
    expect(thumb).toContain('object-cover object-center blur-xl');
  });

  it('shows Korean Weekly titles without English display or row reserve', () => {
    expect(dashboard).toContain('splitLessonTitle');
    expect(dashboard).toContain('titles.koreanTitle');
    expect(weeklyCard).not.toContain('englishTitle');
    expect(weeklyCard).not.toContain('grid-rows-');
    expect(dashboard).not.toContain('MV_HOME_WEEKLY_COPY');
    expect(dashboard).toContain('buildHomeWeeklySupportMeta');
  });

  it('normalizes Home SPOMOVE shelf meta to responseType plus difficulty and trainingFocus', () => {
    expect(shelf).toContain('card.meta.responseType');
    expect(shelf).toContain('card.meta.difficulty');
    expect(shelf).toContain('card.meta.trainingFocus');
    expect(shelf).not.toContain('programLabel');
    expect(dashboard).toContain('getHomeSpomoveShelfCopy');
    expect(dashboard).not.toContain('MV_HOME_SPOMOVE_COPY');
  });

  it('keeps one mobile Weekly rail and presents four SPOMOVE discovery entries for every plan', () => {
    expect(dashboard.match(/w-\[82vw\] max-w-\[340px\]/g)).toHaveLength(2);
    expect(dashboard).toContain('snap-mandatory');
    expect(dashboard).toContain('data-dashboard-section="spomove-extension"');
    expect(dashboard).toContain('featuredSpomove.slice(0, 4)');
    expect(dashboard).toContain('data-spm-spomove-card-action="start"');
    expect(dashboard).toContain('MV_HOME_START_QUIET');
    expect(dashboard).not.toContain('<Play');
  });

  it('keeps Recent as a compact re-entry object and removes the Home navy band', () => {
    expect(dashboard).toContain('MV_REENTRY_OBJECT');
    expect(dashboard).not.toContain('SPM_SECONDARY_BTN');
    expect(dashboard).not.toContain('bg-[var(--spm-spomove-surface)]');
    expect(dashboard).toContain('놀이체육을 디지털 자극 활동으로 확장합니다.');
  });

  it('overlays Weekly play affordance inside the media stage', () => {
    expect(weeklyCard).toContain('absolute left-3 top-3');
    expect(weeklyCard).toContain('relative block w-full');
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
