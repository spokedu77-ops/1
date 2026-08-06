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
    // 카드 메타는 선택 이유 통제 어휘 → LessonCatalogCard 한 줄 메타로 압축한다.
    expect(library).toContain('formatProgramSelectionReasons');
    expect(library).toContain('LessonCatalogCard');
    expect(library).not.toContain('/spokedu-master/class-record?program=${program.id}');
    const catalogCard = read('app/spokedu-master/components/lesson/LessonCatalogCard.tsx');
    expect(catalogCard).toContain('event.stopPropagation()');
    expect(catalogCard).toContain('수업 준비');
  });

  it('keeps preview focused on quick suitability information', () => {
    expect(preview).toContain('model.activityMethod.slice(0, 3)');
    expect(preview).toContain('model.equipment.slice(0, 3)');
    expect(preview).toContain('대표 변형');
    expect(preview).toContain('핵심 안전사항');
    expect(preview).toContain('firstUsableLine(model.variationMethod)');
    expect(preview).toContain('firstUsableLine(model.safetyNotes)');
  });

  it('declares the full lesson material hierarchy and primary CTA routes', () => {
    expect(detail).toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).toContain('이 수업으로 바로 진행');
    expect(detail).toContain('수업 기록 시작');
    expect(detail).not.toContain('getSpomoveSessionHref');
  });

  it('keeps photo-first home with CompactOpsBar only for ops', () => {
    const opsBar = read('app/spokedu-master/dashboard/CompactOpsBar.tsx');
    const model = read('app/spokedu-master/dashboard/homeOpsModel.ts');
    const opsBarIndex = dashboard.indexOf('CompactOpsBar');
    const featuredIndex = dashboard.indexOf('data-dashboard-section="featured-flow"');
    const weeklyIndex = dashboard.indexOf('data-dashboard-section="weekly"');
    const spomoveIndex = dashboard.indexOf('data-dashboard-section="spomove"');
    const contextIndex = dashboard.indexOf('data-dashboard-section="context-programs"');

    expect(dashboard).not.toContain('HomeOpsBoard');
    expect(dashboard).toContain('CompactOpsBar');
    expect(dashboard).toContain('resolveHomeAnchor');
    expect(dashboard).toContain('ContextProgramRow');
    expect(dashboard).toContain('WeeklyProgramCard');
    expect(dashboard).not.toContain('WeeklyFeaturedCard');
    expect(dashboard).not.toContain('data-weekly-featured');
    expect(dashboard).toContain('현장에서 바로 쓰는 수업과 화면 활동을 이어서 준비하세요.');
    expect(dashboard).toContain('현장에서 바로 펼칠 수업');
    expect(dashboard).toContain('활동 준비 열기');
    expect(dashboard).toContain('data-spm-spomove-card-action="start"');
    expect(dashboard).not.toContain('바로 실행');
    expect(dashboard).toContain('spm-btn-primary');
    expect(opsBar).toContain('data-dashboard-section="compact-ops-bar"');
    expect(opsBar).toContain('max-h-[84px]');
    expect(opsBarIndex).toBeGreaterThanOrEqual(0);
    expect(featuredIndex).toBeGreaterThan(opsBarIndex);
    expect(weeklyIndex).toBeGreaterThan(featuredIndex);
    expect(spomoveIndex).toBeGreaterThan(weeklyIndex);
    expect(contextIndex).toBeGreaterThan(spomoveIndex);
    expect(model).toContain('getHomeAnchorIntensity');
    expect(model).toContain("kind: 'record_draft'");
    expect(model).toContain('lesson_opened / video_started / 미리보기 금지');
    expect(dashboard).not.toContain('function ContinueSection');
    expect(dashboard).not.toContain('data-dashboard-section="ops-anchor"');
    expect(dashboard).not.toContain('data-dashboard-section="billboard"');
    expect(dashboard).not.toContain('function SpomoveBillboard');
    expect(dashboard).not.toContain('function HomeBillboard');
    expect(dashboard).not.toContain('HERO_ROTATE_MS');
    expect(dashboard).not.toContain('favoritePrograms');
    expect(dashboard).not.toContain('recentLessonPrograms');
    expect(dashboard).not.toContain('function RailRowHeader');
  });
});
