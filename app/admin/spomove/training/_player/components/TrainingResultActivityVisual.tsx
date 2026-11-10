import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, MoveHorizontal, ScanEye, Speech } from 'lucide-react';
import { ARROWS, SPATIAL_ARROW_COLOR_BY_DIRECTION } from '../constants';
import type { ResultActivityVisual } from '../lib/trainingResultPresentation';
import styles from './TrainingResultScreen.module.css';

const DIRECTION_ICONS = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight } as const;
const COLOR_LABELS = { red: '빨강', yellow: '노랑', green: '초록', blue: '파랑' } as const;

function MotionGlyph({ motion }: { motion: string }) {
  const duck = motion.includes('숙이기');
  const punch = motion.includes('펀치');
  const kick = motion.includes('킥');
  return <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx={duck ? 39 : 32} cy={duck ? 27 : 11} r="5" />
    <path d={duck ? 'M35 35 L23 38 L36 47 L47 52 M23 38 L16 50 L8 50 M33 36 L45 39' : `M32 19 L32 36 M32 23 L${punch ? '49 23 L55 19' : '19 29 L13 22'} M32 23 L${punch ? '21 30' : '45 29 L51 22'} M32 36 L19 52 M32 36 L${kick ? '47 35 L57 27' : '45 52'}`} />
    {motion.includes('점프') ? <path d="M8 43 V31 M5 35 L8 31 L11 35 M56 43 V31 M53 35 L56 31 L59 35" /> : null}
  </svg>;
}

/** Diagrams explain activity structure; they never reconstruct an unrecorded run. */
export function TrainingResultActivityVisual({ visual }: { visual: ResultActivityVisual }) {
  return <figure className={styles.activityVisual} data-activity-visual={visual.kind} aria-label={`${visual.title} · 교육용 예시`}>
    <figcaption className={styles.visualCaption}><span>교육용 예시 · 실제 제시 기록이 아닙니다</span></figcaption>
    {visual.kind === 'direction' ? <div className={styles.directionDiagram}>
      <div className={styles.signalExample}><ArrowUp size={100} strokeWidth={2.5} aria-hidden="true" /><span>화살표 신호 예시</span></div>
      <ArrowRight className={styles.diagramConnector} size={30} aria-hidden="true" />
      <div className={styles.compass} aria-label="위 빨강, 왼쪽 초록, 오른쪽 노랑, 아래 파랑 발판">
        {ARROWS.map(direction => { const Icon = DIRECTION_ICONS[direction.id as keyof typeof DIRECTION_ICONS]; const color = SPATIAL_ARROW_COLOR_BY_DIRECTION[direction.id as keyof typeof SPATIAL_ARROW_COLOR_BY_DIRECTION]; return <div key={direction.id} className={styles.examplePad} data-direction={direction.id} data-pad-color={color}><Icon size={26} aria-hidden="true" /><span>{direction.label} · {COLOR_LABELS[color]}</span></div>; })}
        <Footprints className={styles.compassOrigin} size={28} aria-label="중앙 위치" />
      </div>
    </div> : visual.kind === 'sequence' ? <div className={styles.sequenceDiagram} aria-label="색 순서를 기억하고 같은 순서로 이동하는 예시">
      {(['red', 'yellow', 'blue'] as const).map((color, index) => <React.Fragment key={color}>{index > 0 ? <ArrowRight size={24} aria-hidden="true" /> : null}<div className={styles.sequenceStep}><span className={styles.stepOrder}>{index + 1}번째</span><div className={styles.examplePad} data-pad-color={color}><Footprints size={30} aria-hidden="true" /><span>{COLOR_LABELS[color]}</span></div></div></React.Fragment>)}
    </div> : visual.kind === 'bridge' ? <div className={styles.bridgeDiagram} aria-label="발판 길이가 3칸에서 7칸으로 점차 늘어나는 활동 구조">
      {[3, 4, 5, 6, 7].map(length => <div className={styles.bridgeStage} key={length}><div className={styles.bridgeSteps}>{Array.from({ length }, (_, i) => <span key={i} aria-hidden="true" />)}</div><span>{length}칸</span></div>)}
    </div> : visual.kind === 'flanker' ? <div className={styles.flankerDiagram} aria-label="주변 방해 자극 사이에서 가운데 목표만 구별하는 예시">
      {visual.nested ? <><svg width="180" height="180" viewBox="0 0 180 180" aria-label="바깥 원은 방해 자극, 가장 안쪽 원이 목표" role="img">{[80, 60, 40, 20].map((radius, index) => <circle key={radius} cx="90" cy="90" r={radius} fill="none" stroke="currentColor" strokeWidth={index === 3 ? 10 : 6} opacity={index === 3 ? 1 : .25} />)}</svg><span>가장 안쪽 원이 목표</span></> : [0, 1, 2, 3, 4].map(index => <div key={index} className={index === 2 ? styles.targetStimulus : styles.distractorStimulus}>{visual.arrow ? index === 2 ? <ArrowRight size={42} aria-hidden="true" /> : <ArrowLeft size={42} aria-hidden="true" /> : <span className={styles.shapeStimulus} aria-hidden="true">{index === 2 ? '●' : '◆'}</span>}<span>{index === 2 ? '목표' : '방해'}</span></div>)}
    </div> : visual.kind === 'dive' ? <div className={styles.movementDiagram}>
      {visual.motions.map((motion, index) => <div className={styles.movementTransition} key={`${motion}-${index}`}><div className={styles.movementStep}>{motion === '방향 전환' ? <MoveHorizontal size={64} aria-hidden="true" /> : <MotionGlyph motion={motion} />}<span>{motion}</span></div>{index < visual.motions.length - 1 ? <ArrowRight size={24} aria-hidden="true" /> : null}</div>)}
    </div> : visual.kind === 'layout-memory' ? <div className={styles.memoryDiagram}>
      <div className={styles.memoryGrid} aria-label="색 배치 기억 예시">{Array.from({ length: 9 }, (_, i) => <span key={i} data-pad-color={(['red', 'yellow', 'blue', 'green'] as const)[i % 4]} />)}</div><ArrowRight size={30} aria-hidden="true" /><ScanEye size={64} aria-hidden="true" /><span>바뀐 한 칸 찾기</span>
    </div> : visual.kind === 'number-memory' ? <div className={styles.sequenceDiagram}>
      {(['red', 'green', 'blue'] as const).map((color, index) => <div key={color} className={styles.examplePad} data-pad-color={color}><strong>{index + 1}</strong><span>{COLOR_LABELS[color]}</span></div>)}<ArrowRight size={24} aria-hidden="true" /><span>번호와 색 연결</span>
    </div> : <div className={styles.structureDiagram}>
      <div className={styles.structureSignal} aria-hidden="true">{visual.symbols.map((symbol, index) => <span key={index} data-target={index === visual.targetIndex}>{symbol}</span>)}</div>
      <ArrowRight size={28} aria-hidden="true" /><div className={styles.structureResponse}>{visual.responseKind === 'speak' ? <Speech size={56} aria-hidden="true" /> : visual.responseKind === 'observe' ? <ScanEye size={56} aria-hidden="true" /> : <Footprints size={56} aria-hidden="true" />}<span>{visual.response}</span></div>
    </div>}
    <ol className={styles.activityFlow} aria-label="활동 흐름">{visual.flow.map((step, index) => <li key={step}><span>{index + 1}</span>{step}{index < visual.flow.length - 1 ? <ArrowRight size={16} aria-hidden="true" /> : null}</li>)}</ol>
  </figure>;
}
