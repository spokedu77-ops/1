'use client';

import type { ReactNode } from 'react';
import type { TrainingResultConfig, ColorStimulusCounts } from '../../lib/trainingResultSummary';
import { RESULT_V2_TITLES, validResultCount, resultV2ElapsedMetric, resultV2SignalProgress, resultV2SignalSpeed } from '../../lib/trainingResultV2Shared';
import { ColorRecordPanel, colorRecordFeature } from './ColorRecordPanel';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { ResultV2Actions, ResultV2Banner, ResultV2Frame, ResultV2Metrics, ResultV2RecordFrame, ResultV2Learning } from './ResultV2Frame';
import styles from './ResultV2.module.css';

/** Explicit identity AND resolved theme: never opt other full-screen themes in. */
export function isColorResultV2(cfg: TrainingResultConfig) {
  return cfg.activityId === 'full-screen-cue' && cfg.variantColorTheme === 'color';
}


export function ColorResultV2(props: {
  cfg: TrainingResultConfig; elapsedMs: number; stims?: number; colorCounts: ColorStimulusCounts | null;
  completionReason?: SpomoveCompletionReason; programTitle?: string; theme: string; seed: number; education?: { description: string; tags: string[] };
  student?: { name: string } | null; footer?: ReactNode; resultActions?: ReactNode; resultNotice?: ReactNode; onBack: () => void; onRetry: () => void; retryLabel?: string;
}) {
  const { cfg, stims } = props;
  const reason = props.completionReason ?? 'natural_complete';
  const [status, title] = RESULT_V2_TITLES[reason];
  const target = cfg.timeMode === 'reps' && validResultCount(cfg.targetReps) && cfg.targetReps > 0 ? cfg.targetReps : null;
  const actual = validResultCount(stims) ? stims : null;
  return <ResultV2Frame theme={props.theme} reason={reason}>
    <ResultV2Banner status={status} title={title} activity={props.programTitle ?? '전면단일 · 색상'} student={props.student?.name}
      description={reason === 'stopped_early' ? '여기까지 진행한 내용을 살펴보세요.' : reason === 'cancelled' || reason === 'failed' ? '종료 전까지 기록된 내용을 살펴보세요.' : '화면에 제시되는 색상 신호를 살펴보고 움직임으로 연결하는 활동이에요.'} />
    <ResultV2Metrics items={[
      resultV2ElapsedMetric(props.elapsedMs),
      resultV2SignalProgress(actual, target),
      resultV2SignalSpeed(cfg),
    ]} />
    <div className={styles.contentGrid}><ResultV2RecordFrame feature={colorRecordFeature(props.colorCounts)} featureTitle="가장 많이 제시된 색상" subtitle="화면에 제시된 색상 신호를 확인해 보세요." badge="색상별 제시 기록"><ColorRecordPanel counts={props.colorCounts} /></ResultV2RecordFrame>
      <ResultV2Learning input={props} seed={props.seed} />
    </div><ResultV2Actions onBack={props.onBack} onRetry={props.onRetry} retryLabel="다시 도전하기" footer={props.footer} additionalActions={props.resultActions} notice={props.resultNotice} />
  </ResultV2Frame>;
}
