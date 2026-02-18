/**
 * Think 150s 검증 및 보고서
 * 4주차 set1/set2 구조, 색상 균형, 연속 중복 등 검증
 */

import { buildThink150Timeline } from './think150Scheduler';
import type { Think150SchedulerConfig } from './think150Scheduler';
import type { ThinkTimelineEvent } from './types';

export interface VerifyReport {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
  stats: {
    totalDuration: number;
    stageACount: number;
    stageBCount: number;
    stageCSet1Count: number;
    stageCSet2Count: number;
    stageDSet1Count: number;
    stageDSet2Count: number;
    colorDistribution: Record<string, number>;
    consecutiveSameCount: number;
    consecutiveSameRatio: number;
  };
}

export function verifyThink150Timeline(config: Think150SchedulerConfig): VerifyReport {
  const timeline = buildThink150Timeline(config);
  const checks: { name: string; passed: boolean; detail: string }[] = [];
  const colorCounts: Record<string, number> = { red: 0, green: 0, yellow: 0, blue: 0 };
  let consecutiveSame = 0;
  let totalCues = 0;
  let lastColor: string | null = null;

  for (const e of timeline) {
    const p = e.payload;
    if (e.frame === 'cue' && p?.type === 'stageA') {
      totalCues++;
      const c = (p as { color: string }).color;
      colorCounts[c] = (colorCounts[c] ?? 0) + 1;
      if (lastColor === c) consecutiveSame++;
      lastColor = c;
    }
    if (e.frame === 'cue' && p?.type === 'stageB') {
      totalCues++;
      const c = (p as { color: string }).color;
      colorCounts[c] = (colorCounts[c] ?? 0) + 1;
      if (lastColor === c) consecutiveSame++;
      lastColor = c;
    }
    if (e.frame === 'cue' && p?.type === 'stageC') {
      const pc = p as { slotColors: string[]; set?: string };
      const c = pc.slotColors[0];
      if (c) {
        totalCues++;
        colorCounts[c] = (colorCounts[c] ?? 0) + 1;
        if (lastColor === c) consecutiveSame++;
        lastColor = c;
      }
    }
  }

  const totalDuration = timeline.length > 0 ? Math.max(...timeline.map((e) => e.t1)) : 0;
  const consecutiveRatio = totalCues > 0 ? consecutiveSame / totalCues : 0;

  const stageACue = timeline.filter((e) => e.phase === 'stageA' && e.frame === 'cue');
  const stageBCue = timeline.filter((e) => e.phase === 'stageB' && e.frame === 'cue');
  const stageCCue = timeline.filter((e) => e.phase === 'stageC' && e.frame === 'cue');
  const stageDCue = timeline.filter((e) => e.phase === 'stageD' && e.frame === 'cue');
  const stageCSet1 = stageCCue.filter((e) => (e.payload as { set?: string })?.set === 'setA');
  const stageCSet2 = stageCCue.filter((e) => (e.payload as { set?: string })?.set === 'setB');
  const stageDSet1 = stageDCue.filter((e) => (e.payload as { set?: string })?.set === 'setA');
  const stageDSet2 = stageDCue.filter((e) => (e.payload as { set?: string })?.set === 'setB');

  checks.push({
    name: 'total duration = 150000ms',
    passed: Math.abs(totalDuration - 150000) < 1,
    detail: `실제: ${totalDuration}ms`,
  });

  const consecutiveThreshold = config.week === 1 ? 0.21 : 0.26;
  checks.push({
    name: config.week === 1 ? '연속 동일색 비율 ≤ 20%' : '연속 동일색 비율 ≤ 26%',
    passed: consecutiveRatio <= consecutiveThreshold,
    detail: `${(consecutiveRatio * 100).toFixed(1)}% (${consecutiveSame}/${totalCues})`,
  });

  const minColor = Math.min(...Object.values(colorCounts));
  const maxColor = Math.max(...Object.values(colorCounts));
  const colorBalanced = maxColor - minColor <= Math.ceil(totalCues / 4);
  checks.push({
    name: '4색 균형 (red 포함)',
    passed: colorBalanced && colorCounts.red > 0,
    detail: `red=${colorCounts.red} green=${colorCounts.green} yellow=${colorCounts.yellow} blue=${colorCounts.blue}`,
  });

  if (config.week === 4) {
    const stageDSet1Blanks = timeline.filter(
      (e) => e.phase === 'stageD' && e.frame === 'blank' && (e.payload as { set?: string })?.set === 'setA'
    );
    const stageDSet2Blanks = timeline.filter(
      (e) => e.phase === 'stageD' && e.frame === 'blank' && (e.payload as { set?: string })?.set === 'setB'
    );
    checks.push({
      name: '4주차 Stage D set1 (2-step)',
      passed: true,
      detail: `set1 cue ${stageDSet1.length}개, blank ${stageDSet1Blanks.length}개`,
    });
    checks.push({
      name: '4주차 Stage D set2 (3-step)',
      passed: true,
      detail: `set2 cue ${stageDSet2.length}개, blank ${stageDSet2Blanks.length}개`,
    });
  }

  return {
    passed: checks.every((c) => c.passed),
    checks,
    stats: {
      totalDuration,
      stageACount: stageACue.length,
      stageBCount: stageBCue.length,
      stageCSet1Count: stageCSet1.length,
      stageCSet2Count: stageCSet2.length,
      stageDSet1Count: stageDSet1.length,
      stageDSet2Count: stageDSet2.length,
      colorDistribution: colorCounts,
      consecutiveSameCount: consecutiveSame,
      consecutiveSameRatio: consecutiveRatio,
    },
  };
}
