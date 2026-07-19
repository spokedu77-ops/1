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
    // 카드 footer 메타는 getCardFooterMeta → LessonCatalogCard 한 줄 메타. 예전 getCardDecisionItems 명칭은 폐기.
    expect(library).toContain('function getCardFooterMeta');
    expect(library).toContain('LessonCatalogCard');
    expect(library).not.toContain('/spokedu-master/class-record?program=${program.id}');
    const catalogCard = read('app/spokedu-master/components/lesson/LessonCatalogCard.tsx');
    expect(catalogCard).toContain('event.stopPropagation()');
    expect(catalogCard).toContain('자료 보기');
  });

  it('keeps preview focused on quick suitability information', () => {
    expect(preview).toContain('model.activityMethod.slice(0, 3)');
    expect(preview).toContain('model.equipment.slice(0, 3)');
  });

  it('declares the full lesson material hierarchy and primary CTA routes', () => {
    expect(detail).toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).toContain('이 수업으로 바로 진행');
    expect(detail).toContain('수업 기록 시작');
    expect(detail).not.toContain('getSpomoveSessionHref');
  });

  it('keeps dashboard discovery first and removes duplicate home favorite re-entry', () => {
    const weeklyIndex = dashboard.indexOf('data-dashboard-section="weekly"');
    const spomoveIndex = dashboard.indexOf('data-dashboard-section="spomove"');
    const recentIndex = dashboard.indexOf('<ContinueSection item={continueItem} />');
    const contextIndex = dashboard.indexOf('data-dashboard-section="context-programs"');
    const activityIndex = dashboard.indexOf('<ActivityPanel');

    // 수업 레일 → SPOMOVE → 이어하기 → 맞춤 → 기록 (히어로/빌보드 없음)
    expect(weeklyIndex).toBeGreaterThanOrEqual(0);
    expect(spomoveIndex).toBeGreaterThan(weeklyIndex);
    expect(recentIndex).toBeGreaterThan(spomoveIndex);
    expect(contextIndex).toBeGreaterThan(recentIndex);
    expect(activityIndex).toBeGreaterThan(contextIndex);
    expect(dashboard).not.toContain('data-dashboard-section="billboard"');
    expect(dashboard).not.toContain('function SpomoveBillboard');
    expect(dashboard).not.toContain('function HomeBillboard');
    expect(dashboard).not.toContain('HERO_ROTATE_MS');
    expect(dashboard).not.toContain('data-dashboard-section="lesson-reentry"');
    expect(dashboard).not.toContain('favoritePrograms');
    expect(dashboard).not.toContain('recentLessonPrograms');
    expect(dashboard).not.toContain('function RailRowHeader');
  });
});
