'use client';

import type { ReactNode } from 'react';
import { RESULT_V2_TITLES } from '../../lib/trainingResultV2Shared';
import { buildTrainingResultV2Model, selectV2RecordDetails, type TrainingResultV2Input } from '../../lib/trainingResultV2Model';
import { ResultV2Actions, ResultV2Banner, ResultV2Frame, ResultV2Metrics, ResultV2RecordFrame, ResultV2Learning } from './ResultV2Frame';
import { ColorRecordPanel } from './ColorRecordPanel';
import { DirectionRecordPanel } from './DirectionRecordPanel';
import { RelativeCompassJourneyPanel } from './RelativeCompassJourneyPanel';
import { RoundAnswerList } from './RoundAnswerList';
import { AnswerText } from './AnswerText';
import { padAt } from '../../lib/relativeCompass';
import answerStyles from './RoundAnswerList.module.css';
import { ShapeCompletionAnswers } from './ShapeCompletionAnswers';
import { NumberRecordV2 } from './NumberRecordV2';
import { ZoneRecordV2 } from './ZoneRecordV2';
import { SequenceMemoryRecordV2 } from './SequenceMemoryRecordV2';
import { InstantMemoryRecordV2 } from './InstantMemoryRecordV2';
import { TeacherInputRecordV2 } from './TeacherInputRecordV2';
import { TimeConfigurationRecordV2 } from './TimeConfigurationRecordV2';
import { RecordV2Details } from './RecordV2Details';
import { CARDINAL_DIRECTIONS } from '../../lib/directionPresentation';
import styles from './ResultV2.module.css';
import details from './RecordV2Details.module.css';

const BADGES = { color: '색상별 제시 기록', direction: '방향별 제시 기록', zone: '목표 구역별 기록', number: '숫자별 제시 기록', sequence: '순서·연합 기억', instant: '순간 기억 기록', teacher: '교사 입력 기록', time: '시간·구성 기록' };
export function UnifiedResultV2(props: TrainingResultV2Input & { seed: number; theme: string; student?: { name: string } | null; resultActions?: ReactNode; resultNotice?: ReactNode; footer?: ReactNode; onBack: () => void; onRetry: () => void }) {
  const model = buildTrainingResultV2Model(props, props.seed);
  const { kind, vm } = model;
  const featureTitle = kind === 'color' ? '가장 많이 제시된 색상' : kind === 'direction' ? '가장 많이 제시된 방향' : kind === 'zone' ? model.id === 'goalkeeper' || model.id === 'number-cart' ? '가장 많이 도착한 구역' : '가장 많이 제시된 구역' : kind === 'number' ? '가장 많이 제시된 숫자' : '기록 요약';
  const [status, title] = RESULT_V2_TITLES[vm.reason];
  const { facts: recordFacts, settings: recordSettings } = selectV2RecordDetails(model);
  const panels = {
    color: <ColorRecordPanel counts={vm.distribution.length ? Object.fromEntries(vm.distribution.map(item => [item.id, item.count])) as NonNullable<typeof props.colorCounts> : null} />,
    direction: model.id === 'relative-compass' ? <div className={answerStyles.list}>{props.directionRecord?.journeys?.length ? props.directionRecord.journeys.map((journey, index) => <details key={index} className={answerStyles.round}><summary><span>{index + 1}라운드</span><strong><AnswerText text={`${padAt(journey.start).name} → ${padAt(journey.steps.filter(step => step.completed).at(-1)?.destination ?? journey.start).name}`} /></strong></summary><div className={answerStyles.body}><RelativeCompassJourneyPanel journey={journey} /></div></details>) : <RelativeCompassJourneyPanel journey={props.directionRecord?.journey} />}</div> : <DirectionRecordPanel record={props.directionRecord} supportedDirections={CARDINAL_DIRECTIONS} />,
    zone: model.zones.length ? <ZoneRecordV2 items={model.zones} horizontal={model.horizontalZones} /> : <RecordV2Details title="실제 진행 기록" items={recordFacts} />,
    number: <NumberRecordV2 items={model.distribution} />,
    sequence: <SequenceMemoryRecordV2 association={model.id !== 'sequence-memory'} settings={recordSettings} />,
    instant: <InstantMemoryRecordV2 gridSize={model.cfg.colorMemoryGridSize} settings={recordSettings} />,
    teacher: <TeacherInputRecordV2 colorChoice={model.teacher?.scoringMode === 'color-choice'} items={recordFacts} settings={recordSettings} available={!!model.teacher} />,
    time: <TimeConfigurationRecordV2 facts={recordFacts} settings={recordSettings} />,
  };
  return <ResultV2Frame theme={props.theme} reason={vm.reason} layout={`${kind}-v2`}>
    <ResultV2Banner status={status} title={title} activity={vm.activityTitle} student={props.student?.name} description={vm.reason === 'natural_complete' ? model.education.description : vm.reason === 'stopped_early' ? '여기까지 진행한 내용을 살펴보세요.' : '종료 전까지 기록된 내용을 살펴보세요.'} />
    <ResultV2Metrics items={model.metrics} />
    <div className={styles.contentGrid}><ResultV2RecordFrame featureTitle={featureTitle} subtitle={props.roundAnswers?.length ? '제시된 문제의 정답을 라운드별로 확인해 보세요.' : model.id === 'shape-completion' ? '각 라운드의 정답 색을 확인해 보세요.' : model.id === 'relative-compass' ? '출발 색부터 마지막 도착 색까지 순서대로 따라가 보세요.' : kind === 'zone' ? '목표 위치와 실제 집계 기준을 확인해 보세요.' : kind === 'number' ? '실제로 표시된 숫자의 기록을 확인해 보세요.' : '기록된 활동과 사용한 설정을 구분해 살펴보세요.'} badge={props.roundAnswers?.length ? '라운드별 정답' : model.id === 'shape-completion' ? '라운드별 정답' : model.id === 'relative-compass' ? '정답 여정' : BADGES[kind]} feature={props.roundAnswers?.length ? null : model.id === 'relative-compass' ? null : kind === 'instant' || kind === 'teacher' ? null : model.feature}>
      {model.id === 'shape-completion' ? <ShapeCompletionAnswers record={props.shapeCompletionRecord} /> : props.roundAnswers?.length ? <RoundAnswerList record={props.roundAnswers} /> : panels[kind]}
      {['color', 'direction', 'zone', 'number', 'instant', 'sequence'].includes(kind) && !(kind === 'zone' && !model.zones.length) && model.id !== 'relative-compass' && !props.roundAnswers?.length && recordFacts.length ? <RecordV2Details title="실제 진행 기록" items={recordFacts} /> : null}
      {['color', 'direction', 'zone', 'number'].includes(kind) && recordSettings.length ? <RecordV2Details title="사용한 설정" items={recordSettings} /> : null}
      {model.note && !props.roundAnswers?.length && model.id !== 'shape-completion' ? <p className={details.note}>{model.note}</p> : null}
    </ResultV2RecordFrame><ResultV2Learning input={{ ...props, glassBridge: model.teacher }} seed={props.seed} /></div>
    <ResultV2Actions onBack={props.onBack} onRetry={props.onRetry} additionalActions={props.resultActions} notice={props.resultNotice} footer={props.footer} />
  </ResultV2Frame>;
}
