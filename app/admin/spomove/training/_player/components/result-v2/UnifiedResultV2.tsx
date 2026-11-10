'use client';

import type { ReactNode } from 'react';
import { buildTrainingResultV2Model, type TrainingResultV2Input } from '../../lib/trainingResultV2Model';
import { ResultV2Actions, ResultV2Banner, ResultV2Experiences, ResultV2Frame, ResultV2Metrics, ResultV2RecordFrame, ResultV2Reflection } from './ResultV2Frame';
import { ColorRecordPanel } from './ColorResultV2';
import { DirectionRecordPanel } from './DirectionResultV2';
import { NumberRecordV2 } from './NumberRecordV2';
import { ZoneRecordV2 } from './ZoneRecordV2';
import { SequenceMemoryRecordV2 } from './SequenceMemoryRecordV2';
import { InstantMemoryRecordV2 } from './InstantMemoryRecordV2';
import { TeacherInputRecordV2 } from './TeacherInputRecordV2';
import { TimeConfigurationRecordV2 } from './TimeConfigurationRecordV2';
import { RecordV2Details } from './RecordV2Details';
import { ALL_DIRECTIONS, CARDINAL_DIRECTIONS } from '../../lib/directionPresentation';
import styles from './ResultV2.module.css';
import details from './RecordV2Details.module.css';

const TITLES = {
  natural_complete: ['활동 완료', '오늘의 활동을 마쳤어요!'], stopped_early: ['중도 종료', '오늘은 여기까지 진행했어요.'],
  cancelled: ['실행 취소', '활동 실행을 취소했어요.'], failed: ['실행 오류', '활동 실행이 중단되었어요.'],
} as const;
const BADGES = { color: '색상별 제시 기록', direction: '방향별 제시 기록', zone: '목표 구역별 기록', number: '숫자별 제시 기록', sequence: '순서·연합 기억', instant: '순간 기억 기록', teacher: '교사 입력 기록', time: '시간·구성 기록' };
export function UnifiedResultV2(props: TrainingResultV2Input & { seed: number; theme: string; student?: { name: string } | null; resultActions?: ReactNode; resultNotice?: ReactNode; footer?: ReactNode; onBack: () => void; onRetry: () => void }) {
  const model = buildTrainingResultV2Model(props, props.seed);
  const { kind, vm } = model;
  const association = model.id === 'color-number-memory' || model.id === 'color-number-quiz';
  const [status, title] = TITLES[vm.reason];
  const panels = {
    color: <ColorRecordPanel counts={vm.distribution.length ? Object.fromEntries(vm.distribution.map(item => [item.id, item.count])) as NonNullable<typeof props.colorCounts> : null} />,
    direction: <DirectionRecordPanel record={props.directionRecord} supportedDirections={model.id === 'relative-compass' ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS} />,
    zone: model.zones.length ? <ZoneRecordV2 items={model.zones} horizontal={model.horizontalZones} /> : <RecordV2Details title="실제 진행 기록" items={model.facts} />,
    number: <NumberRecordV2 items={model.distribution} />,
    sequence: <SequenceMemoryRecordV2 association={model.id !== 'sequence-memory'} settings={model.settings} />,
    instant: <InstantMemoryRecordV2 gridSize={model.cfg.colorMemoryGridSize} settings={model.settings} />,
    teacher: <TeacherInputRecordV2 colorChoice={model.teacher?.scoringMode === 'color-choice'} items={model.facts} settings={model.settings} available={!!model.teacher} />,
    time: <TimeConfigurationRecordV2 facts={model.facts} settings={model.settings} />,
  };
  return <ResultV2Frame theme={props.theme} reason={vm.reason} layout={`${kind}-v2`}>
    <ResultV2Banner status={status} title={title} activity={vm.activityTitle} student={props.student?.name} description={vm.reason === 'natural_complete' ? model.education.description : vm.reason === 'stopped_early' ? '여기까지 진행한 내용을 살펴보세요.' : '종료 전까지 기록된 내용을 살펴보세요.'} />
    <ResultV2Metrics items={model.metrics} />
    <div className={styles.contentGrid}><ResultV2RecordFrame subtitle={kind === 'zone' ? '목표 위치와 실제 집계 기준을 확인해 보세요.' : kind === 'number' ? '실제로 표시된 숫자의 기록을 확인해 보세요.' : '기록된 활동과 사용한 설정을 구분해 살펴보세요.'} badge={BADGES[kind]} feature={model.feature}>
      {panels[kind]}
      {['color', 'direction', 'zone', 'number', 'instant', 'sequence'].includes(kind) && model.facts.length ? <RecordV2Details title="실제 진행 기록" items={model.facts} /> : null}
      {['color', 'direction', 'zone', 'number'].includes(kind) && model.settings.length ? <RecordV2Details title="사용한 설정" items={model.settings} /> : null}
      <p className={details.note}>{model.note}</p>
    </ResultV2RecordFrame><aside className={styles.sidebar}><ResultV2Experiences items={model.education.experiences} /><ResultV2Reflection question={model.reflection.question} extra={model.reflection.prompts[association ? 1 : 0]} movement={association ? '기억나는 번호와 색의 연결을 몸으로 표현해 볼까요?' : kind === 'sequence' || kind === 'teacher' ? '기억나는 순서를 몸의 움직임으로 표현해 볼까요?' : kind === 'instant' ? '기억나는 위치 두 곳을 몸으로 표현해 볼까요?' : kind === 'time' ? '기억나는 움직임 두 가지를 이어서 표현해 볼까요?' : kind === 'number' ? '숫자에 맞는 위치를 몸으로 짚어 볼까요?' : '기억나는 목표와 반응을 몸으로 표현해 볼까요?'} /></aside></div>
    <ResultV2Actions onBack={props.onBack} onRetry={props.onRetry} additionalActions={props.resultActions} notice={props.resultNotice} footer={props.footer} />
  </ResultV2Frame>;
}
