import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('MASTER information and action grammar', () => {
  const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
  const guide = read('app/spokedu-master/library/[id]/components/DetailLessonGuide.tsx');
  const personalized = read('app/spokedu-master/components/information/PersonalizedNote.tsx');
  const decision = read('app/spokedu-master/components/information/SystemDecisionBanner.tsx');
  const dashboard = read('app/spokedu-master/dashboard/TodaySessionsPanel.tsx');
  const spomove = read('app/spokedu-master/spomove/SpomoveHubView.tsx');

  it('separates static content, system decisions, and personalized memory', () => {
    expect(personalized).toContain('data-personalized-note');
    expect(personalized).toContain('before:bg-blue-500');
    expect(decision).toContain('data-system-decision');
    expect(dashboard).toContain('<SystemDecisionBanner');
    expect(detail).toContain('<PersonalizedNote');
  });

  it('keeps explicit memory behind core lesson understanding and preparation', () => {
    expect(guide.indexOf('data-detail-personalized-context')).toBeGreaterThan(guide.indexOf('data-detail-row="execution"'));
    expect(guide.indexOf('data-detail-personalized-context')).toBeGreaterThan(guide.indexOf('data-detail-row="preparation"'));
    expect(detail).not.toContain('applicationIdea: session.memo');
    expect(detail).toContain('&capture=1');
  });

  it('keeps one dominant action per local decision context', () => {
    expect(detail).toContain('data-detail-support-actions');
    expect(detail).not.toContain('grid-cols-3');
    expect(spomove).toContain("sessionAssignment ? 'border border-slate-200");
    expect(spomove).toContain('이 수업에 추가');
    expect(spomove).toContain('활동 준비');
    expect(spomove).not.toContain('실행 설정');
  });
});
