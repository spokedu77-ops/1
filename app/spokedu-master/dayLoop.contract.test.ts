import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

/**
 * P2 — 하루 루프 전 여정 계약.
 * library(지정) → home(today) → record → report → home → spomove
 * 홈 CompactOpsBar 확대·새 선반·히어로 변경 금지.
 */
describe('SPOKEDU MASTER day loop journey (P2)', () => {
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
    expect(detail).toContain('오늘 수업 해제');
    expect(detail).toContain('setTodayLesson(ownerId');
    expect(detail).toContain('수업 기록 시작');
    expect(detail).toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).toContain('spm-btn-primary');
    expect(detail).toContain('data-loop-action="home"');
  });

  it('keeps CompactOpsBar today_lesson as prepare/record without growing the bar', () => {
    expect(homeOps).toContain("kind: 'today_lesson'");
    expect(homeOps).toContain("label: '준비'");
    expect(homeOps).toContain('`/spokedu-master/library/${encodeURIComponent(programId)}`');
    expect(homeOps).toContain("label: '기록'");
    expect(homeOps).toContain('`/spokedu-master/class-record?program=${encodeURIComponent(programId)}`');
    expect(opsBar).toContain("anchor.kind === 'today_lesson'");
    expect(opsBar).toContain('max-h-[84px]');
    expect(opsBar).toContain('오늘 수업 해제');
    expect(opsBar).toContain('{anchor.primary.label}');
    expect(opsBar).toContain('{anchor.secondary.label}');
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
