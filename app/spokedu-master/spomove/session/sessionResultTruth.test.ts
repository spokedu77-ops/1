import { describe, expect, it } from 'vitest';

import { buildDiveActionMoveReport } from '@/app/admin/spomove/training/_player/lib/diveActionMoveReport';
import { resolveTrainingResultRichContent } from '@/app/admin/spomove/training/_player/lib/trainingResultRichContent';
import type { TrainingResultConfig } from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import {
  resolveSpomoveCompletionPresentation,
  type SpomoveCompletionReason,
} from './sessionResultModel';

const baseConfig: TrainingResultConfig = {
  mode: 'basic',
  level: 2,
  timeMode: 'reps',
  duration: 0,
  targetReps: 20,
};

const statusCases = [
  'natural_complete',
  'stopped_early',
  'cancelled',
  'failed',
] as const satisfies readonly SpomoveCompletionReason[];

describe('MASTER SPOMOVE result truth', () => {
  it.each(statusCases)('uses the authoritative %s state in general result content', (completionReason) => {
    const presentation = resolveSpomoveCompletionPresentation(completionReason);
    const rich = resolveTrainingResultRichContent(baseConfig, 18_000, null, {
      programTitle: '색 따라 움직이기',
      volumeLabel: '20회',
      completionReason,
    });

    expect(rich.praise).toBe(presentation.title);
    expect(rich.praiseSub).toBe(presentation.description);
    expect(rich.activityFeel).toBe(presentation.statusBadge);
    expect(rich.sessionSnapshot).toContainEqual({ id: 'status', label: '종료 상태', value: presentation.statusBadge });
    expect(rich.sessionSnapshot).toContainEqual({ id: 'elapsed', label: '진행 시간', value: '18초' });
    expect(rich.sessionSnapshot).toContainEqual({ id: 'volume', label: '설정 분량', value: '20회' });
    expect(JSON.stringify(rich)).not.toMatch(/끝까지 완주|끝까지 집중해서|차분하게 끝까지|오늘 느낌/);
  });

  it.each([
    ['spatial', 7, '한눈에 색 배치 기억하기', 'stopped_early'],
    ['basic', 8, '맞는 조각 찾아가기', 'cancelled'],
    ['basic', 7, '내 자리에서 방향 따라가기', 'failed'],
  ] as const)('applies result truth to the %s/%s special branch', (mode, level, programTitle, completionReason) => {
    const rich = resolveTrainingResultRichContent(
      { ...baseConfig, mode, level },
      12_000,
      null,
      { programTitle, volumeLabel: '10회', completionReason },
    );
    const presentation = resolveSpomoveCompletionPresentation(completionReason);

    expect(rich.praise).toBe(presentation.title);
    expect(rich.activityFeel).toBe(presentation.statusBadge);
    expect(JSON.stringify(rich)).not.toMatch(/끝까지|정확히 이동했어요|집중해서 찾아봤어요|오늘 느낌/);
  });

  it.each(statusCases)('applies the authoritative %s state to DIVE without claiming configured actions were counted', (completionReason) => {
    const report = buildDiveActionMoveReport({
      completed: completionReason === 'natural_complete',
      stageDurationSec: 20,
      flowFeatures: ['punch', 'kick', 'duck'],
      flowIncludeBonus: true,
      flowLayout: 'sequential',
    }, 42_000, completionReason);
    const presentation = resolveSpomoveCompletionPresentation(completionReason);

    expect(report.title).toBe(presentation.title);
    expect(report.statusBadge).toBe(presentation.statusBadge);
    expect(report.sessionStatusValue).toBe(presentation.statusBadge);
    expect(report.movementBody).toContain('설정된 액션 구성');
    expect(report.snapshot).toContainEqual(expect.objectContaining({ id: 'elapsed', value: '42초' }));
    expect(JSON.stringify(report)).not.toMatch(/끝까지 완료|연속해서 수행했어요/);
  });

  it('retains the existing Admin result behavior when no completion reason is supplied', () => {
    const rich = resolveTrainingResultRichContent(baseConfig, 18_000, null, { programTitle: '색 따라 움직이기' });
    const dive = buildDiveActionMoveReport({ completed: true, stageDurationSec: 20 }, 42_000);

    expect(rich.praiseSub).toContain('끝까지 완주했어요');
    expect(dive.title).toBe('DIVE 활동 완료');
    expect(dive.statusBadge).toBe('활동 완료');
  });
});
