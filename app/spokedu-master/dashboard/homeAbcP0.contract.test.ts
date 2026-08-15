import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  LIBRARY_SELECTION_REASON_MAX,
  LIBRARY_SELECTION_REASONS,
} from '../library/librarySelectionReasons';
import { TODAY_LESSON_TIME_ZONE } from '../lib/todayLesson';

/**
 * P0 — A/B/C 컴포넌트 계약 회귀.
 * UI 재구현이 아니라 Freeze·CTA·선택이유·dayKey 원칙이 깨지지 않았는지만 본다.
 * A < 7.0 롤백 사유가 코드에 다시 들어오면 여기가 먼저 실패해야 한다.
 */
function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
const opsBar = read('app/spokedu-master/dashboard/CompactOpsBar.tsx');
const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
const sheet = read('app/spokedu-master/spomove/SpomoveGuidelineSheet.tsx');
const reasons = read('app/spokedu-master/library/librarySelectionReasons.ts');
const todayLesson = read('app/spokedu-master/lib/todayLesson.ts');
const freezeRule = read('.cursor/rules/spokedu-master-home-freeze.mdc');

describe('home A/B/C P0 component contracts', () => {
  it('locks Freeze rule: phase names, forbid-6, Seoul dayKey, no 8-point claim', () => {
    expect(freezeRule).toContain('A < 7.0이면 해당 Phase 롤백');
    expect(freezeRule).toContain('홈 톤 재조율');
    expect(freezeRule).toContain('운영 루프 1개');
    expect(freezeRule).toContain('금지 6');
    expect(freezeRule).toContain('Asia/Seoul');
    expect(freezeRule).toContain('8점대 선언 금지');
    expect(freezeRule).toContain('준비(강)');
    expect(freezeRule).toContain('기록(약)');
    expect(freezeRule).toContain('max-h-[84px]');
    expect(freezeRule).toContain('HomeOpsBoard');
    expect(freezeRule).toContain('바로 실행');
    expect(freezeRule).toContain('이 설정으로 시작');
    expect(freezeRule).toContain('근거 없는 칩 금지');
    expect(freezeRule).toContain('마감만');
    expect(freezeRule).toContain('캡처 QA 후 최소 보정');
  });

  it('locks todayLesson dayKey to Asia/Seoul (not browser local TZ)', () => {
    expect(TODAY_LESSON_TIME_ZONE).toBe('Asia/Seoul');
    expect(todayLesson).toContain("timeZone: TODAY_LESSON_TIME_ZONE");
    expect(todayLesson).toContain('getSeoulDayKey');
    expect(todayLesson).not.toContain('toLocaleDateString');
  });

  it('forbids HomeOpsBoard and keeps CompactOpsBar height capped', () => {
    expect(dashboard).not.toContain('HomeOpsBoard');
    expect(dashboard).toContain('CompactOpsBar');
    expect(opsBar).toContain('data-dashboard-section="compact-ops-bar"');
    expect(opsBar).toContain('max-h-[84px]');
    expect(opsBar).toContain('높이 체감 56~84px');
    expect(opsBar).toContain('준비(강)');
    expect(opsBar).toContain('기록(약)');
    expect(opsBar).toContain('1줄 truncate');
    expect(opsBar).not.toContain('HomeOpsBoard');
    expect(opsBar).not.toContain('min-h-[140px]');
    expect(opsBar).not.toContain('min-h-36');
  });

  it('keeps home section order: ops bar → weekly photos → spomove → context', () => {
    const opsBarIndex = dashboard.indexOf('CompactOpsBar');
    const weeklyIndex = dashboard.indexOf('data-dashboard-section="weekly"');
    const spomoveIndex = dashboard.indexOf('data-dashboard-section="spomove"');
    const contextIndex = dashboard.indexOf('data-dashboard-section="context-programs"');
    expect(opsBarIndex).toBeGreaterThanOrEqual(0);
    expect(weeklyIndex).toBeGreaterThan(opsBarIndex);
    expect(spomoveIndex).toBeGreaterThan(weeklyIndex);
    expect(contextIndex).toBeGreaterThan(spomoveIndex);
  });

  it('locks SPOMOVE preparation contract on home (not dive / not 바로 실행)', () => {
    expect(dashboard).toContain('getSpomovePresetDisplayModel');
    expect(dashboard).toContain('displayModel.displayTitle');
    expect(dashboard).toContain('<span>활동 준비</span>');
    expect(dashboard).toContain('활동 준비 열기');
    expect(dashboard).toContain('data-spm-spomove-card-action="start"');
    expect(dashboard).not.toContain('바로 실행');
    expect(dashboard).not.toContain('바로 시작');
    expect(dashboard).not.toContain('가이드 보기');
  });

  it('locks SPOMOVE preparation + start settings on hub; guide stays off the card CTA', () => {
    expect(hub).toContain('<span>활동 준비</span>');
    expect(hub).toContain('활동 준비 열기');
    expect(hub).toContain('data-spm-spomove-start-mode="guide"');
    expect(hub).toContain('data-spm-spomove-start-mode="settings"');
    expect(hub).toContain('시작 설정');
    expect(hub).not.toContain('바로 실행');
    expect(hub).not.toContain('바로 시작');
    expect(hub).not.toContain('가이드 보기');
    expect(hub).not.toContain('data-spm-spomove-card-action="guide"');
  });

  it('locks GuidelineSheet as start-confirm with honest primary', () => {
    expect(sheet).toContain('수업 시작');
    expect(sheet).toContain('진행 방법');
    expect(sheet).toContain('data-spm-spomove-launch-confirm');
    expect(sheet).toContain('data-spm-spomove-guide-action="start-official"');
    expect(sheet).not.toContain('바로 시작');
    expect(sheet).not.toContain('바로 실행');
    expect(sheet).not.toContain('autostart: true');
  });

  it('P2 today lessons: renders and removes each accumulated lesson', () => {
    expect(opsBar).toContain('todayLessons.map');
    expect(opsBar).toContain('onRemoveTodayLesson(lesson.programId)');
    expect(opsBar).toContain('오늘 수업에서 제거');
    expect(opsBar).toContain('/spokedu-master/library/${lesson.programId}');
    expect(dashboard).toContain('removeTodayLesson');
    expect(dashboard).toContain('getActiveTodayLessons(todayLessonByOwner, recentActivityOwnerId)');
    expect(dashboard).not.toContain('state.getTodayLessons(recentActivityOwnerId)');
  });

  it('hides first-start guide when today lesson or drafts already exist', () => {
    expect(dashboard).toContain('!todayLessonAssignment');
    expect(dashboard).toContain('!hasMeaningfulClassRecordDraft(classRecordDraft)');
    expect(dashboard).toContain('!hasMeaningfulReportDraft(reportDraft)');
    expect(dashboard).toContain('!hasMeaningfulPrepDraft(quickRecordDraft)');
    expect(dashboard).toContain('readOwnerSaveDraft');
  });

  it('locks selection-reason principle: controlled vocab and max chips (enforce later in P3)', () => {
    expect(reasons).toContain('자동 매핑 근거가 있을 때만 노출');
    expect(LIBRARY_SELECTION_REASON_MAX).toBeLessThanOrEqual(3);
    expect(Object.keys(LIBRARY_SELECTION_REASONS).length).toBeGreaterThan(0);
    expect(LIBRARY_SELECTION_REASONS.spomove.label).toBe('SPOMOVE 연계');
  });

  it('P1 tone rebalance: header stays light and operations-flow stays tertiary', () => {
    expect(dashboard).not.toContain('bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#f1f5f9_100%)]');
    expect(dashboard).toContain('상황별 수업');
    expect(dashboard).toContain('lg:grid-cols-[minmax(0,1fr)_280px]');
    expect(dashboard).toContain('>추천</p>');
    expect(dashboard).not.toContain('조건에 맞는 보조 수업');
    expect(dashboard).not.toContain('bg-slate-50/60');
    expect(dashboard).not.toContain('현장으로 이어가기');
  });
});
