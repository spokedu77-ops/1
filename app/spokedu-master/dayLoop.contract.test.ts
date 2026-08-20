import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

/** library(지정) → home(today) → record → report → home → spomove 여정 계약. */
describe('SPOKEDU MASTER day loop journey', () => {
  const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
  const opsBar = read('app/spokedu-master/dashboard/CompactOpsBar.tsx');
  const homeOps = read('app/spokedu-master/dashboard/homeOpsModel.ts');
  const classRecord = read('app/spokedu-master/class-record/page.tsx');
  const report = read('app/spokedu-master/report/page.tsx');
  const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
  const spomove = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
  const loop = read('app/spokedu-master/lib/masterUserLoop.ts');

  it('starts the day from library detail: assign today + open record', () => {
    expect(detail).toContain('오늘 수업으로 지정');
    expect(detail).toContain('✓ 오늘 수업 지정됨');
    expect(detail).toContain('setTodayLesson(ownerId');
    expect(detail).toContain('disabled={!ownerId || isTodayLesson}');
    expect(detail).toContain('수업 기록 시작');
    expect(detail).toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).toContain('spm-btn-primary');
    expect(detail.match(/data-detail-action=/g)).toHaveLength(3);
  });

  it('keeps unfinished work visible above multi-lesson preparation and removal', () => {
    expect(homeOps).toContain("kind: 'today_lesson'");
    expect(homeOps).toContain("label: '준비'");
    expect(homeOps).toContain('`/spokedu-master/library/${encodeURIComponent(programId)}`');
    expect(homeOps).toContain("label: '기록'");
    expect(homeOps).toContain('`/spokedu-master/class-record?program=${encodeURIComponent(programId)}`');
    expect(opsBar).toContain('if (todayLessons.length > 0)');
    expect(opsBar).toContain("anchor.kind === 'record_draft' || anchor.kind === 'report_draft'");
    expect(opsBar).toContain('data-compact-ops-section="unfinished"');
    expect(opsBar).toContain('data-compact-ops-section="today-lessons"');
    expect(opsBar.indexOf('data-compact-ops-section="unfinished"')).toBeLessThan(
      opsBar.indexOf('data-compact-ops-section="today-lessons"'),
    );
    expect(opsBar).toContain('todayLessons.map');
    expect(opsBar).toContain('/spokedu-master/class-record?program=${lesson.programId}');
    expect(opsBar).toContain('max-h-[84px]');
    expect(opsBar).toContain('오늘 수업에서 제거');
    expect(opsBar).toContain('onRemoveTodayLesson(lesson.programId)');
    expect(homeOps.indexOf('buildRecordDraftAnchor(input)')).toBeLessThan(
      homeOps.indexOf('buildReportDraftAnchor(input)'),
    );
  });

  it('closes record and report back to home with loop CTAs', () => {
    expect(classRecord).toContain('data-loop-action="home"');
    expect(classRecord).toContain('href="/spokedu-master/dashboard"');
    expect(report).toContain('data-loop-action="home"');
    expect(report).toContain('href="/spokedu-master/dashboard"');
  });

  it('keeps home ops + loop action selection wired for returning teachers', () => {
    expect(dashboard).toContain('resolveHomeAnchor');
    expect(dashboard).toContain('CompactOpsBar');
    expect(dashboard).toContain('selectMasterLoopAction');
    expect(loop).toContain("key: 'operate'");
    expect(loop).toContain("href: '/spokedu-master/activity'");
  });

  it('keeps SPOMOVE start as the post-home screen activity step', () => {
    expect(spomove).toContain('data-spm-spomove-card-action="start"');
    expect(spomove).toContain('spm-btn-primary');
    expect(dashboard).toContain('data-dashboard-section="spomove"');
    expect(dashboard).toContain('data-spm-spomove-card-action="start"');
  });
});
