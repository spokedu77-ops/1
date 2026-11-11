'use client';

import type { ReactNode } from 'react';
import type { TrainingResultConfig } from '../../lib/trainingResultSummary';
import { RESULT_V2_TITLES, validResultCount, resultV2ElapsedMetric, resultV2SignalProgress, resultV2SignalSpeed } from '../../lib/trainingResultV2Shared';
import { DirectionRecordPanel, directionRecordFeature } from './DirectionRecordPanel';
import { validDirectionRecord, type DirectionPresentationRecord } from '../../lib/directionPresentation';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { ResultV2Actions, ResultV2Banner, ResultV2Frame, ResultV2Metrics, ResultV2RecordFrame, ResultV2Learning } from './ResultV2Frame';
import styles from './ResultV2.module.css';
import directionStyles from './DirectionResultV2.module.css';

/** Identity is supplied by the resolved official preset, never inferred from a title. */
export function isDirectionResultV2(cfg: TrainingResultConfig, presetId?: string) {
  return presetId === 'reaction-cognition-space-direction-01' && cfg.activityId === 'direction-cue'
    && cfg.mode === 'basic' && cfg.level === 1 && (cfg.spatialArrowColorMode === undefined || cfg.spatialArrowColorMode === 'basic');
}
export function DirectionResultV2(props: {
  cfg: TrainingResultConfig; elapsedMs: number; stims?: number; directionRecord?: DirectionPresentationRecord; completionReason?: SpomoveCompletionReason;
  programTitle?: string; theme: string; seed: number; education?: { description: string; tags: string[] }; student?: { name: string } | null; footer?: ReactNode; resultActions?: ReactNode; resultNotice?: ReactNode; onBack: () => void; onRetry: () => void;
}) {
  const { cfg, directionRecord } = props;
  const reason = props.completionReason ?? 'natural_complete';
  const [status, title] = RESULT_V2_TITLES[reason];
  const actual = validDirectionRecord(directionRecord) ? directionRecord.signals : validResultCount(props.stims) ? props.stims : null;
  const target = cfg.timeMode === 'reps' && validResultCount(cfg.targetReps) && cfg.targetReps > 0 ? cfg.targetReps : null;
  return <ResultV2Frame theme={props.theme} reason={reason} layout="direction-v2">
    <ResultV2Banner status={status} title={title} activity={props.programTitle ?? '반응 인지 · 화살표'} student={props.student?.name}
      description={reason === 'stopped_early' ? '여기까지 진행한 내용을 살펴보세요.' : reason === 'cancelled' || reason === 'failed' ? '종료 전까지 기록된 내용을 살펴보세요.' : '화면에 제시되는 방향 신호를 살펴보고 움직임으로 연결하는 활동이에요.'} />
    <ResultV2Metrics items={[
      resultV2ElapsedMetric(props.elapsedMs),
      resultV2SignalProgress(actual, target),
      resultV2SignalSpeed(cfg),
    ]} />
    <div className={styles.contentGrid}><ResultV2RecordFrame featureTitle="가장 많이 제시된 방향" subtitle="화면에 제시된 방향 신호를 확인해 보세요." badge="방향별 제시 기록" feature={directionRecordFeature(directionRecord)}>
      <DirectionRecordPanel record={directionRecord} />
      {validDirectionRecord(directionRecord) && directionRecord.presented !== directionRecord.signals ? <p className={directionStyles.note}>신호 {directionRecord.signals}회 · 목표 화살표 {directionRecord.presented}개 제시</p> : null}
    </ResultV2RecordFrame><ResultV2Learning input={props} seed={props.seed} /></div>
    <ResultV2Actions onBack={props.onBack} onRetry={props.onRetry} additionalActions={props.resultActions} notice={props.resultNotice} footer={props.footer} />
  </ResultV2Frame>;
}
