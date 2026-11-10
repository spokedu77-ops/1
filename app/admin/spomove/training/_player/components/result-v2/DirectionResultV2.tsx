'use client';

import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import type { TrainingResultConfig } from '../../lib/trainingResultSummary';
import { formatElapsedSeconds } from '../../lib/trainingResultSummary';
import { CARDINAL_DIRECTIONS, validDirectionRecord, type DirectionPresentationRecord, type DirectionId } from '../../lib/directionPresentation';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { ResultV2Actions, ResultV2Banner, ResultV2Experiences, ResultV2Frame, ResultV2Metrics, ResultV2RecordFrame, ResultV2Reflection } from './ResultV2Frame';
import styles from './ResultV2.module.css';
import directionStyles from './DirectionResultV2.module.css';

/** Identity is supplied by the resolved official preset, never inferred from a title. */
export function isDirectionResultV2(cfg: TrainingResultConfig, presetId?: string) {
  return presetId === 'reaction-cognition-space-direction-01' && cfg.activityId === 'direction-cue'
    && cfg.mode === 'basic' && cfg.level === 1 && (cfg.spatialArrowColorMode === undefined || cfg.spatialArrowColorMode === 'basic');
}
const DIRECTIONS: Record<DirectionId, { icon: string; name: string; row: number; column: number }> = {
  up: { icon: '↑', name: '상단', row: 1, column: 2 }, down: { icon: '↓', name: '하단', row: 3, column: 2 },
  left: { icon: '←', name: '좌측', row: 2, column: 1 }, right: { icon: '→', name: '우측', row: 2, column: 3 },
  'up-left': { icon: '↖', name: '좌상단', row: 1, column: 1 }, 'up-right': { icon: '↗', name: '우상단', row: 1, column: 3 },
  'down-left': { icon: '↙', name: '좌하단', row: 3, column: 1 }, 'down-right': { icon: '↘', name: '우하단', row: 3, column: 3 },
};
const DIRECTION_ICONS = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight, 'up-left': ArrowUpLeft, 'up-right': ArrowUpRight, 'down-left': ArrowDownLeft, 'down-right': ArrowDownRight };
const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function directionRecordFeature(record?: DirectionPresentationRecord) {
  if (!validDirectionRecord(record)) return null;
  const peak = Math.max(...record.directions.map(id => record.counts[id]!));
  if (!peak) return null;
  const leaders = record.directions.filter(id => record.counts[id] === peak).map(id => DIRECTIONS[id].name);
  return leaders.length === record.directions.length
    ? `${record.directions.length === 4 ? '네' : record.directions.length} 방향의 신호가 같은 횟수로 제시되었어요.`
    : `${leaders.join('·')} 방향 신호가 ${leaders.length > 1 ? '같은 횟수로 ' : ''}가장 많이 제시되었어요.`;
}

/** Reusable 3×3 compass: only authored/recorded supported directions occupy cells. */
export function DirectionRecordPanel({ record, supportedDirections = CARDINAL_DIRECTIONS }: { record?: DirectionPresentationRecord; supportedDirections?: readonly DirectionId[] }) {
  const valid = validDirectionRecord(record);
  const recordedDirections = record?.directions.filter(id => Object.hasOwn(DIRECTIONS, id));
  const directions = recordedDirections?.length ? [...new Set(recordedDirections)] : supportedDirections;
  return <div className={`${styles.colorGrid} ${directionStyles.compass}`} aria-label="방향별 실제 제시 횟수">
    {directions.map(id => { const item = DIRECTIONS[id]; const Icon = DIRECTION_ICONS[id]; return <div key={id} className={directionStyles.card} style={{ gridRow: item.row, gridColumn: item.column }}>
      <Icon className={directionStyles.arrow} aria-hidden="true" /><strong>{item.name}</strong><span className={directionStyles.count}>{valid ? `${record.counts[id]}회` : '기록 없음'}</span><span className={directionStyles.label}>신호 제시</span>
    </div>; })}
    <div className={directionStyles.origin}><span aria-hidden="true">＋</span><span>방향 기준</span></div>
  </div>;
}
const TITLES = {
  natural_complete: ['활동 완료', '오늘의 활동을 마쳤어요!'], stopped_early: ['중도 종료', '오늘은 여기까지 진행했어요.'],
  cancelled: ['실행 취소', '활동 실행을 취소했어요.'], failed: ['실행 오류', '활동 실행이 중단되었어요.'],
} as const;
const EXPERIENCES = [
  { label: '방향 변별', description: '서로 다른 방향 표시를 살펴보고 신호가 가리키는 방향을 구별하는 활동을 경험합니다.' },
  { label: '선택 반응', description: '화살표의 방향을 확인하고 해당 위치로 움직이는 과정을 연결합니다.' },
  { label: '시지각-운동 협응', description: '화면의 방향 정보를 신체 움직임으로 연결하며 이동 방향과 움직임을 조절하는 경험을 제공합니다.' },
];
export function DirectionResultV2(props: {
  cfg: TrainingResultConfig; elapsedMs: number; stims?: number; directionRecord?: DirectionPresentationRecord; completionReason?: SpomoveCompletionReason;
  programTitle?: string; theme: string; student?: { name: string } | null; footer?: ReactNode; resultActions?: ReactNode; resultNotice?: ReactNode; onBack: () => void; onRetry: () => void;
}) {
  const { cfg, directionRecord } = props;
  const reason = props.completionReason ?? 'natural_complete';
  const [status, title] = TITLES[reason];
  const actual = validDirectionRecord(directionRecord) ? directionRecord.signals : validCount(props.stims) ? props.stims : null;
  const target = cfg.timeMode === 'reps' && validCount(cfg.targetReps) && cfg.targetReps > 0 ? cfg.targetReps : null;
  const speed = typeof cfg.speed === 'number' && Number.isFinite(cfg.speed) && cfg.speed > 0 ? cfg.speed : null;
  const accelerating = cfg.accel && !cfg.intervalMode;
  return <ResultV2Frame theme={props.theme} reason={reason} layout="direction-v2">
    <ResultV2Banner status={status} title={title} activity={props.programTitle ?? '반응 인지 · 화살표'} student={props.student?.name}
      description={reason === 'stopped_early' ? '여기까지 진행한 내용을 살펴보세요.' : reason === 'cancelled' || reason === 'failed' ? '종료 전까지 기록된 내용을 살펴보세요.' : '화면에 제시되는 방향 신호를 살펴보고 움직임으로 연결하는 활동이에요.'} />
    <ResultV2Metrics items={[
      { label: '활동 시간', value: Number.isFinite(props.elapsedMs) && props.elapsedMs >= 0 ? props.elapsedMs === 0 ? '0초' : formatElapsedSeconds(props.elapsedMs) : '기록 없음', note: '실제 진행 시간' },
      { label: '진행 라운드', value: actual !== null ? target !== null ? `${actual} / ${target}회` : `${actual}회` : '기록 없음', note: actual !== null && target !== null ? `전체 ${target}회 중 ${actual}회 진행` : actual !== null ? '실제 신호 제시 횟수' : target !== null ? `설정 ${target}회 · 진행 기록 없음` : '진행 기록 없음', progress: actual !== null && target !== null && actual <= target ? { current: actual, total: target } : undefined },
      { label: '신호 속도', value: speed === null ? '기록 없음' : accelerating ? `${speed}초부터 가속` : `${speed}초`, note: accelerating ? '설정된 신호 제시 시간 · 점차 짧아짐' : '설정된 신호 제시 시간' },
    ]} />
    <div className={styles.contentGrid}><ResultV2RecordFrame subtitle="화면에 제시된 방향 신호를 확인해 보세요." badge="방향별 제시 기록" feature={directionRecordFeature(directionRecord)}>
      <DirectionRecordPanel record={directionRecord} />
      {validDirectionRecord(directionRecord) && directionRecord.presented !== directionRecord.signals ? <p className={directionStyles.note}>신호 {directionRecord.signals}회 · 목표 화살표 {directionRecord.presented}개 제시</p> : null}
    </ResultV2RecordFrame><aside className={styles.sidebar}><ResultV2Experiences items={EXPERIENCES} /><ResultV2Reflection question="화살표를 보았을 때 어떤 방향 정보를 먼저 확인했나요?" extra="화살표의 방향이 바뀌었을 때 무엇을 먼저 살펴봤나요?" movement="기억나는 방향 두 가지를 몸으로 표현해 볼까요?" /></aside></div>
    <ResultV2Actions onBack={props.onBack} onRetry={props.onRetry} additionalActions={props.resultActions} notice={props.resultNotice} footer={props.footer} />
  </ResultV2Frame>;
}
