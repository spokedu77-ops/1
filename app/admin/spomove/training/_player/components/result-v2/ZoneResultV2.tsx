'use client';

import type { ReactNode } from 'react';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import type { TrainingResultConfig } from '../../lib/trainingResultSummary';
import { RESULT_V2_TITLES, validResultCount, resultV2ElapsedMetric } from '../../lib/trainingResultV2Shared';
import { normalizeReactSpeedSec } from '../../lib/reactTrainTiming';
import { GOALKEEPER_RESULT_ZONES, validGoalkeeperResult, type GoalkeeperResultRecord } from '../../lib/goalkeeperResultRecord';
import { ResultV2Actions, ResultV2Banner, ResultV2Frame, ResultV2Metrics, ResultV2RecordFrame, ResultV2Learning } from './ResultV2Frame';
import styles from './ResultV2.module.css';
import zoneStyles from './ZoneResultV2.module.css';

export function isZoneResultV2(cfg: TrainingResultConfig, presetId?: string) {
  return presetId === 'visual-reaction-goalkeeper-easy-skeleton' && cfg.activityId === 'goalkeeper'
    && cfg.mode === 'reactTrain' && cfg.level === 10 && cfg.goalkeeperTier === 1;
}
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** CORNERS' target lane, not spawn corner or the color-counter object's key order. */
export function goalkeeperZoneFeature(record?: GoalkeeperResultRecord) {
  if (!validGoalkeeperResult(record)) return null;
  const peak = Math.max(...record.laneCount);
  if (!peak) return null;
  const leaders = GOALKEEPER_RESULT_ZONES.filter(zone => record.laneCount[zone.lane] === peak).map(zone => zone.label);
  if (leaders.length === 4) return '네 구역에 같은 횟수로 목표가 도착했어요.';
  return `${leaders.join('·')}에 ${leaders.length > 1 ? '같은 횟수로 ' : ''}목표가 가장 많이 도착했어요.`;
}

export function GoalkeeperZonePanel({ record }: { record?: GoalkeeperResultRecord }) {
  const valid = validGoalkeeperResult(record);
  return <ul className={styles.colorGrid} aria-label="목표 도착 구역별 실제 집계 횟수">{GOALKEEPER_RESULT_ZONES.map(zone => <li key={zone.id} data-color={zone.color}>
    <div className={styles.colorHeading}><strong>{zone.label}</strong></div>
    <div className={styles.recordCount}>{valid ? <><span>{record.laneCount[zone.lane]}</span><small>회</small></> : <small>기록 없음</small>}</div>
  </li>)}</ul>;
}
export function ZoneResultV2(props: {
  cfg: TrainingResultConfig; elapsedMs: number; stims?: number; goalkeeperRecord?: GoalkeeperResultRecord;
  completionReason?: SpomoveCompletionReason; programTitle?: string; theme: string; seed: number; education?: { description: string; tags: string[] }; student?: { name: string } | null;
  footer?: ReactNode; resultActions?: ReactNode; resultNotice?: ReactNode; onBack: () => void; onRetry: () => void;
}) {
  const record = validGoalkeeperResult(props.goalkeeperRecord) && props.goalkeeperRecord.tier === 1 ? props.goalkeeperRecord : undefined;
  const reason = props.completionReason ?? 'natural_complete';
  const [status, title] = RESULT_V2_TITLES[reason];
  const speed = record?.baseTravelSeconds ?? (typeof props.cfg.speed === 'number' && Number.isFinite(props.cfg.speed) && props.cfg.speed > 0 ? normalizeReactSpeedSec(props.cfg.speed) : null);
  const waves = record?.waveCount;
  const target = record?.targetWaveCount;
  const arrived = record?.stims ?? (validResultCount(props.stims) ? props.stims : null);
  return <ResultV2Frame theme={props.theme} reason={reason} layout="zone-v2">
    <ResultV2Banner status={status} title={title} activity={props.programTitle ?? '시지각 반응 · 골키퍼 · 쉬움'} student={props.student?.name}
      description={reason === 'stopped_early' ? '여기까지 진행한 내용을 살펴보세요.' : reason === 'cancelled' || reason === 'failed' ? '종료 전까지 기록된 내용을 살펴보세요.' : '목표의 이동 경로와 도착 구역을 살펴보고 움직임으로 연결하는 활동이에요.'} />
    <ResultV2Metrics items={[
      resultV2ElapsedMetric(props.elapsedMs),
      { label: record ? '일반 웨이브' : '목표 도착', value: waves !== undefined ? target != null ? `${waves} / ${target}회` : `${waves}회` : arrived !== null ? `${arrived}회` : '기록 없음', note: record ? '시작된 일반 웨이브 · 보너스 제외' : '도착 시점에 집계된 목표 신호', progress: waves !== undefined && target != null && target > 0 && waves <= target ? { current: waves, total: target } : undefined },
      { label: '기본 이동 시간', value: speed === null ? '기록 없음' : `${speed}초`, note: '일반 진행의 목표 이동 설정' },
    ]} />
    <div className={styles.contentGrid}><ResultV2RecordFrame featureTitle="가장 많이 도착한 구역" subtitle="목표가 도착한 구역을 기준으로 집계한 기록입니다." badge="목표 구역별 기록" feature={goalkeeperZoneFeature(record)}>
      <GoalkeeperZonePanel record={record} />
      <div className={zoneStyles.recordDetails}>
        {record ? <dl><div><dt>일반 진행 목표 도착</dt><dd>{sum(record.regularLaneCount)}회</dd></div><div><dt>보너스 목표 도착</dt><dd>{record.bonusStarted ? `${sum(record.bonusLaneCount)}회` : '진행 전'}</dd></div><div><dt>전체 목표 도착</dt><dd>{record.stims}회</dd></div></dl> : <p>구역별 기록 없음{arrived !== null ? ` · 목표 도착 ${arrived}회` : ''}</p>}
        {record?.bonusStarted ? <p>구역별 횟수에는 보너스 기록이 포함됩니다. 보너스에서는 목표 이동 속도가 점차 빨라집니다.</p> : null}
      </div>
    </ResultV2RecordFrame><ResultV2Learning input={props} seed={props.seed} /></div>
    <ResultV2Actions onBack={props.onBack} onRetry={props.onRetry} additionalActions={props.resultActions} notice={props.resultNotice} footer={props.footer} />
  </ResultV2Frame>;
}
