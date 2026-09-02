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
    expect(catalogCard).toContain("primaryActionLabel = '활동 살펴보기'");
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
    expect(detail).toContain('AssignProgramToSessionButton');
    expect(detail).toContain('/spokedu-master/activity');
    expect(detail).not.toContain('getSpomoveSessionHref');
  });

  it('keeps Weekly curation and one continuity action without catalog duplication', () => {
    const todayPanel = read('app/spokedu-master/dashboard/TodaySessionsPanel.tsx');
    const todayModel = read('app/spokedu-master/dashboard/todaySessionsModel.ts');
    const featuredIndex = dashboard.indexOf('data-dashboard-section="featured-flow"');
    const weeklyIndex = dashboard.indexOf('data-dashboard-section="weekly"');

    expect(dashboard).not.toContain('HomeOpsBoard');
    expect(dashboard).toContain('HomeContinuityPanel');
    expect(dashboard).not.toContain('resolveHomeAnchor');
    expect(dashboard).toContain('WeeklyProgramCard');
    expect(dashboard).not.toContain('WeeklyFeaturedCard');
    expect(dashboard).not.toContain('data-weekly-featured');
    expect(dashboard).toContain('이번 주 SPOKEDU 추천');
    expect(dashboard).toContain('!program.isPro');
    expect(dashboard).toContain('data-dashboard-section="spomove-extension"');
    expect(dashboard).toContain('featuredSpomove.slice(0, 4)');
    expect(dashboard).not.toContain('data-dashboard-section="spomove-discovery"');
    expect(dashboard).not.toContain('data-dashboard-section="context-programs"');
    expect(todayPanel).toContain('data-dashboard-section="continuity"');
    expect(todayModel).toContain('deriveMasterSessionWorkState');
    expect(todayModel).toContain('href: workState.href');
    expect(dashboard).not.toContain('resolveMasterHomePriority');
    expect(dashboard).not.toContain('data-home-priority');
    expect(dashboard).toContain("{'이번 주,\\n어떤 수업을 해볼까요?'}");
    expect(todayPanel).toContain("session.status === 'scheduled'");
    expect(todayPanel).not.toContain('출석 확인하기');
    expect(weeklyIndex).toBeGreaterThan(featuredIndex);
    expect(dashboard).not.toContain('function ContinueSection');
    expect(dashboard).not.toContain('data-dashboard-section="ops-anchor"');
    expect(dashboard).not.toContain('data-dashboard-section="billboard"');
    expect(dashboard).not.toContain('function SpomoveBillboard');
    expect(dashboard).not.toContain('function HomeBillboard');
    expect(dashboard).not.toContain('HERO_ROTATE_MS');
    expect(dashboard).not.toContain('favoritePrograms');
    expect(dashboard).not.toContain('recentLessonPrograms');
    expect(dashboard).not.toContain('function RailRowHeader');
    expect(dashboard).toContain('if (!mounted) return <DashboardSkeleton />');
    expect(dashboard).not.toContain('if (!mounted || !programsLoaded)');
  });

  it('offers content-first and Session-first entry as peer paths', () => {
    expect(dashboard).toContain('좋은 활동부터 찾아보기');
    expect(dashboard).toContain('수업부터 만들기');
    expect(dashboard).toContain('콘텐츠부터 찾아도, 수업부터 만들어도');
  });
});
