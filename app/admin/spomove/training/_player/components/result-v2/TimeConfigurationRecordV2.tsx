import type { ResultFact } from '../../lib/trainingResultViewModel';
import { RecordV2Details } from './RecordV2Details';
import { ArrowUp, ArrowDown, MoveHorizontal, Hand, Footprints, Zap, ScanEye, Sparkles } from 'lucide-react';
import styles from './TimeConfigurationRecordV2.module.css';

const MOTIONS = {
  '점프': { Icon: ArrowUp, description: '장애물 신호에 맞춰 위로 뛰기' },
  '숙이기': { Icon: ArrowDown, description: '낮은 자세로 장애물 피하기' },
  '방향 전환': { Icon: MoveHorizontal, description: '신호가 가리키는 방향으로 이동하기' },
  '펀치': { Icon: Hand, description: '목표를 향해 팔을 뻗기' },
  '킥': { Icon: Footprints, description: '목표를 향해 다리를 뻗기' },
  '뻗기': { Icon: Hand, description: '목표 위치를 향해 몸을 길게 뻗기' },
  '빠른 움직임': { Icon: Zap, description: '빠르게 바뀌는 신호 따라가기' },
  '색상 게이트': { Icon: ScanEye, description: '색상 신호를 구별해 통과하기' },
};

export function TimeConfigurationRecordV2({ facts, settings }: { facts: ResultFact[]; settings: ResultFact[] }) {
  const labels = [...new Set(settings.filter(item => ['actions', 'modules'].includes(item.id)).flatMap(item => item.value.split(' · ')))];
  const bonus = labels.includes('보너스');
  const movements = labels.filter(label => label !== '보너스');
  const stage = settings.find(item => item.id === 'stage');
  return <div className={styles.record}>
    <div className={styles.intro}><span>움직임 돌아보기</span><h3>신호를 보고, 몸으로 연결하는 액션 무브</h3><p>화면의 장애물과 목표를 살피며 다음 움직임을 준비하는 활동입니다. 이번에 선택한 동작을 살펴보세요.</p></div>
    {movements.length ? <ul className={styles.motions}>{movements.map(label => {
      const motion = MOTIONS[label as keyof typeof MOTIONS];
      const Icon = motion?.Icon ?? Zap;
      return <li key={label}><span className={styles.icon}><Icon aria-hidden="true" /></span><div><h4>{label}</h4><p>{motion?.description ?? '화면의 신호에 맞춰 움직이기'}</p></div></li>;
    })}</ul> : <p>이번 활동의 동작 설정이 전달되지 않았습니다.</p>}
    <div className={styles.context}>{stage ? <p><strong>단계당 {stage.value}</strong><span>설정한 시간에 맞춰 동작을 이어가는 구성</span></p> : null}{bonus ? <p><Sparkles aria-hidden="true" /><strong>보너스 포함</strong><span>일반 동작에 보너스 구간을 더한 구성</span></p> : null}</div>
    {facts.length ? <RecordV2Details title="실제 진행 기록" items={facts} /> : null}
  </div>;
}
