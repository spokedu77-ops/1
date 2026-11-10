'use client';

import type { ReactNode } from 'react';
import type { TrainingResultConfig, ColorStimulusCounts } from '../../lib/trainingResultSummary';
import { formatElapsedSeconds } from '../../lib/trainingResultSummary';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { ResultV2Actions, ResultV2Banner, ResultV2Experiences, ResultV2Frame, ResultV2Metrics, ResultV2RecordFrame, ResultV2Reflection } from './ResultV2Frame';
import styles from './ResultV2.module.css';

/** Explicit identity AND resolved theme: never opt other full-screen themes in. */
export function isColorResultV2(cfg: TrainingResultConfig) {
  return cfg.activityId === 'full-screen-cue' && cfg.variantColorTheme === 'color';
}

const COLORS = [{ id: 'red', name: '빨강' }, { id: 'yellow', name: '노랑' }, { id: 'green', name: '초록' }, { id: 'blue', name: '파랑' }] as const;
const TITLES = {
  natural_complete: ['활동 완료', '오늘의 활동을 마쳤어요!'],
  stopped_early: ['중도 종료', '오늘은 여기까지 진행했어요.'],
  cancelled: ['실행 취소', '활동 실행을 취소했어요.'],
  failed: ['실행 오류', '활동 실행이 중단되었어요.'],
} as const;
const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Priority: all equal > tied leaders > unique leader. Zero/missing records have no highlight. */
export function colorRecordFeature(counts: ColorStimulusCounts | null) {
  if (!counts || !COLORS.every(color => validCount(counts[color.id]))) return null;
  const peak = Math.max(...COLORS.map(color => counts[color.id]));
  if (peak === 0) return null;
  const leaders = COLORS.filter(color => counts[color.id] === peak).map(color => color.name);
  if (leaders.length === 4) return '네 가지 색상 신호가 같은 횟수로 제시되었어요.';
  if (leaders.length > 1) return `${leaders.join('·')} 신호가 같은 횟수로 가장 많이 제시되었어요.`;
  return `${leaders[0]} 신호가 가장 많이 제시되었어요.`;
}

export function ColorRecordPanel({ counts }: { counts: ColorStimulusCounts | null }) {
  return <ul className={styles.colorGrid} aria-label="색상별 실제 제시 횟수">{COLORS.map(color => {
    const value = counts?.[color.id];
    return <li key={color.id} data-color={color.id}><div className={styles.colorHeading}><strong><span aria-hidden="true" />{color.name}</strong><span>{validCount(value) ? `${value}회` : '기록 없음'}</span></div><span className={styles.colorDisc} aria-hidden="true" /></li>;
  })}</ul>;
}

const EXPERIENCES = [
  { label: '색상 변별', description: '화면에 나타나는 서로 다른 색상을 구별하는 활동을 경험합니다.' },
  { label: '선택 반응', description: '제시된 색상을 확인하고 해당 위치로 움직이는 과정을 연결합니다.' },
  { label: '시지각-운동 협응', description: '시각정보를 신체 움직임으로 연결하며 움직임을 조절하는 경험을 제공합니다.' },
];

export function ColorResultV2(props: {
  cfg: TrainingResultConfig; elapsedMs: number; stims?: number; colorCounts: ColorStimulusCounts | null;
  completionReason?: SpomoveCompletionReason; programTitle?: string; theme: string;
  student?: { name: string } | null; footer?: ReactNode; resultActions?: ReactNode; resultNotice?: ReactNode; onBack: () => void; onRetry: () => void; retryLabel?: string;
}) {
  const { cfg, stims } = props;
  const reason = props.completionReason ?? 'natural_complete';
  const [status, title] = TITLES[reason];
  const target = cfg.timeMode === 'reps' && validCount(cfg.targetReps) && cfg.targetReps > 0 ? cfg.targetReps : null;
  const actual = validCount(stims) ? stims : null;
  const speed = typeof cfg.speed === 'number' && Number.isFinite(cfg.speed) && cfg.speed > 0 ? cfg.speed : null;
  const accelerating = cfg.accel && !cfg.intervalMode;
  const speedValue = speed === null ? '기록 없음' : accelerating ? `${speed}초부터 가속` : `${speed}초`;
  return <ResultV2Frame theme={props.theme} reason={reason}>
    <ResultV2Banner status={status} title={title} activity={props.programTitle ?? '전면단일 · 색상'} student={props.student?.name}
      description={reason === 'stopped_early' ? '여기까지 진행한 내용을 살펴보세요.' : reason === 'cancelled' || reason === 'failed' ? '종료 전까지 기록된 내용을 살펴보세요.' : '화면에 제시되는 색상 신호를 살펴보고 움직임으로 연결하는 활동이에요.'} />
    <ResultV2Metrics items={[
      { label: '활동 시간', value: Number.isFinite(props.elapsedMs) && props.elapsedMs >= 0 ? props.elapsedMs === 0 ? '0초' : formatElapsedSeconds(props.elapsedMs) : '기록 없음', note: '실제 진행 시간' },
      { label: '진행 라운드', value: actual !== null ? target !== null ? `${actual} / ${target}회` : `${actual}회` : '기록 없음', note: actual !== null && target !== null ? `전체 ${target}회 중 ${actual}회 진행` : actual !== null ? '실제 신호 제시 횟수' : target !== null ? `설정 ${target}회 · 진행 기록 없음` : '진행 기록 없음', progress: actual !== null && target !== null && actual <= target ? { current: actual, total: target } : undefined },
      { label: '신호 속도', value: speedValue, note: accelerating ? '설정된 신호 제시 시간 · 점차 짧아짐' : '설정된 신호 제시 시간' },
    ]} />
    <div className={styles.contentGrid}><ResultV2RecordFrame feature={colorRecordFeature(props.colorCounts)} subtitle="화면에 제시된 색상 신호를 확인해 보세요." badge="색상별 제시 기록"><ColorRecordPanel counts={props.colorCounts} /></ResultV2RecordFrame>
      <aside className={styles.sidebar}><ResultV2Experiences items={EXPERIENCES} /><ResultV2Reflection question="색상이 바뀌었을 때 무엇을 먼저 살펴봤나요?" extra="비슷하게 느껴지는 색이 있었나요?" movement="기억나는 색 두 가지를 찾아 움직여 볼까요?" /></aside>
    </div><ResultV2Actions onBack={props.onBack} onRetry={props.onRetry} retryLabel="다시 도전하기" footer={props.footer} additionalActions={props.resultActions} notice={props.resultNotice} />
  </ResultV2Frame>;
}
