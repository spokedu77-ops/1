import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER class tools placement', () => {
  it('keeps class tools out of discovery entry points', () => {
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    const library = read('app/spokedu-master/library/LibraryView.tsx');
    const preview = read('app/spokedu-master/components/lesson/ProgramPreviewModal.tsx');

    expect(dashboard).not.toContain('/spokedu-master/class-tools');
    expect(library).not.toContain('/spokedu-master/class-tools');
    expect(preview).not.toContain('/spokedu-master/class-tools');
  });

  it('keeps TEACH tools directly accessible while preserving contextual Session access', () => {
    const statusBar = read('app/spokedu-master/components/layout/StatusBar.tsx');
    const tabBar = read('app/spokedu-master/components/layout/TabBar.tsx');
    const navLabels = read('app/spokedu-master/components/layout/masterNavLabels.ts');
    const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');

    expect(statusBar).toContain('MASTER_NAV_ITEMS');
    expect(navLabels).toContain("href: '/spokedu-master/class-tools', label: '수업 도구'");
    expect(navLabels).toContain("href: '/spokedu-master/classes', label: '수업반'");
    expect(tabBar).toContain("classes: UsersRound");
    expect(tabBar).toContain("classes: 'attendance'");
    expect(tabBar).toContain("'class-tools': Wrench");
    expect(tabBar).toContain("'class-tools': 'classTools'");
    expect(detail).not.toContain('/spokedu-master/class-tools');
  });

  it('ClassToolsView supports standalone use and validated Session return context', () => {
    const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');

    expect(tools).toContain('parseMasterWorkReturnHref');
    expect(tools).toContain("searchParams.get('returnTo')");
    expect(tools).toContain("requestedSessionId ? buildActivitySessionHref(requestedSessionId) : '/spokedu-master/activity'");
    expect(tools).toContain('invalidSessionContext');
    expect(tools).not.toContain('window.location.href');
    expect(tools).not.toContain('TOOL_STATUS');
    expect(tools).not.toContain('TOOL_HELP');
    expect(tools).not.toContain('수업 중 바로 꺼내 쓰는 진행 콘솔');
    expect(tools).toContain('data-class-tools-tabs');
    expect(tools).toContain('data-class-tools-dock');
    expect(tools).toContain('data-class-tools-content');
    expect(tools).toContain('현장에서 바로 사용하는 도구');
    expect(tools).toContain('수업으로 돌아가기');
    expect(tools).toContain('aria-pressed={active}');
  });

  it('separates activity and rest countdowns while preserving custom minutes/seconds', () => {
    const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');
    const model = read('app/spokedu-master/components/ui/classToolsModel.ts');

    expect(tools).toContain("useState<CountdownTimerMode>('activity')");
    expect(tools).toContain("(['activity', 'rest'] as const)");
    expect(tools).toContain('modeConfig.options.map');
    expect(tools).toContain('수행 +1');
    expect(model).toContain('COUNTDOWN_TIMER_MODE_CONFIG');
    expect(model).toContain("expiredLabel: '활동 시간이 끝났습니다.'");
    expect(model).toContain("expiredLabel: '휴식 시간이 끝났습니다.'");
    expect(tools).toContain('const [selectedDurationMs, setSelectedDurationMs]');
    expect(tools).toContain('const [customMinutes, setCustomMinutes]');
    expect(tools).toContain('const [customSeconds, setCustomSeconds]');
    expect(tools).toContain('const selectDuration = useCallback');
    expect(tools).toContain('const updateCustomMinutes = useCallback');
    expect(tools).toContain('const updateCustomSeconds = useCallback');
    expect(tools).toContain('disabled={durationSelectDisabled}');
    expect(tools).toContain('setCompletedMs(selectedDurationMs - nextRemainingMs)');
    expect(tools).not.toContain('setCompletedMs(RETURN_TIMER_DURATION_MS - nextRemainingMs)');
  });

  it('filters the three roster tools by the selected class', () => {
    const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');

    expect(tools).toContain('function ClassSelector');
    expect(tools).toContain('진행할 반');
    expect(tools).toContain('const [selectedClassKey, setSelectedClassKey]');
    expect(tools).toContain("item.id === effectiveClassKey)?.studentIds.includes(student.id)");
    expect(tools).not.toContain('student.group');
    expect(tools).toContain('students={selectedStudents}');
    expect(tools).toContain("tab === 'picker' || tab === 'teams' || tab === 'order'");
  });

  it('provides class-scoped tournament and ladder tools', () => {
    const tools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');

    expect(tools).toContain("{ id: 'tournament', label: '토너먼트'");
    expect(tools).toContain("{ id: 'ladder', label: '사다리타기'");
    expect(tools).toContain('function TournamentTab');
    expect(tools).toContain('function LadderTab');
    expect(tools).toContain("tab === 'tournament' && <TournamentTab");
    expect(tools).toContain("tab === 'ladder' && <LadderTab");
    expect(tools).toContain("tab === 'tournament' || tab === 'ladder'");
  });
});
