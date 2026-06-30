import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const library = read('app/spokedu-master/library/LibraryView.tsx');
const preview = read('app/spokedu-master/components/lesson/LessonPreviewContent.tsx');
const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');

describe('lesson discovery and execution flow contract', () => {
  it('shows decision metadata and non-conflicting card actions in the library', () => {
    expect(library).toContain('function getCardDecisionItems');
    expect(library).toContain('event.stopPropagation();');
    expect(library).not.toContain('/spokedu-master/class-record?program=${program.id}');
  });

  it('keeps preview focused on quick suitability information', () => {
    expect(preview).toContain('model.activityMethod.slice(0, 3)');
    expect(preview).toContain('model.equipment.slice(0, 6)');
  });

  it('declares the full lesson material hierarchy and primary CTA routes', () => {
    expect(detail).toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).toContain('getSpomoveSessionHref(program, primarySpomovePreset)');
  });

  it('keeps dashboard discovery first and removes duplicate home favorite re-entry', () => {
    const weeklyIndex = dashboard.indexOf('data-dashboard-section="weekly"');
    const recentIndex = dashboard.indexOf('<ContinueSection item={continueItem} />');
    const spomoveIndex = dashboard.indexOf('data-dashboard-section="spomove"');
    const contextIndex = dashboard.indexOf('data-dashboard-section="context-programs"');
    const activityIndex = dashboard.indexOf('<ActivityPanel');

    expect(weeklyIndex).toBeGreaterThanOrEqual(0);
    expect(recentIndex).toBeGreaterThan(weeklyIndex);
    expect(spomoveIndex).toBeGreaterThan(recentIndex);
    expect(contextIndex).toBeGreaterThan(spomoveIndex);
    expect(activityIndex).toBeGreaterThan(contextIndex);
    expect(dashboard).not.toContain('data-dashboard-section="lesson-reentry"');
    expect(dashboard).not.toContain('favoritePrograms');
    expect(dashboard).not.toContain('recentLessonPrograms');
  });
});
