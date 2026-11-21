export const TRAINING_GROUPS = {
  response: { label: '단순 반응', color: '#F87171' },
  attention: { label: '선택 반응', color: '#FBBF24' },
  executive: { label: '복합 반응', color: '#34D399' },
  advanced: { label: '심화 반응', color: '#60A5FA' },
} as const;

export type TrainingFilter = 'ALL' | keyof typeof TRAINING_GROUPS;

// Presentation groups only; runtime activity and entry semantics stay with onPick.
const programs = [
  { id: 'basic', title: '반응 인지', en: 'Reactive Cognition', group: 'response', icon: 'ϟ', desc: '화면 신호를 보고 판단하여 해당 색 위치로 빠르게 이동합니다.' },
  { id: 'reactTrain', title: '시지각 반응', en: 'Visual Reaction', group: 'response', icon: '◉', desc: '움직이는 색 자극을 포착하고 해당 색 위치로 반응합니다.' },
  { id: 'simon', title: '사이먼 이펙트', en: 'Simon Effect', group: 'attention', icon: '◆', desc: '자극의 위치에 흔들리지 않고 정해진 색·방향 규칙에 반응합니다.' },
  { id: 'flanker', title: '플랭커 이펙트', en: 'Flanker Effect', group: 'attention', icon: '◎', desc: '주변의 방해 자극 속에서 가운데 목표만 구분해 반응합니다.' },
  { id: 'stroop', title: '스트룹 이펙트', en: 'Stroop Effect', group: 'executive', icon: '↔', desc: '글자의 의미와 색을 구분하고 지정된 규칙에 따라 이동합니다.' },
  { id: 'spatial', title: '순차 기억', en: 'Sequential Memory', group: 'executive', icon: '▦', desc: '순서대로 제시되는 시각 자극을 기억하고 같은 순서로 재현합니다.' },
  { id: 'flow', title: 'DIVE 3D', en: 'Interactive Sports', group: 'advanced', icon: '◇', desc: '화면 속에서 달리고, 점프하고, 장애물을 피하는 전신 움직임 훈련입니다.' },
  { id: 'sports', title: '스포츠 테마', en: 'Sports Theme', group: 'advanced', icon: '⚔', desc: '1번 펜싱 · 런지, 2번 검도 · 일도양단. 색과 타이밍을 읽고 스포츠 동작으로 반응합니다.' },
] as const;

export const TRAINING_PROGRAMS = programs.map(program => ({
  ...program,
  enter: (onPick: (modeId: string) => void) => onPick(program.id),
}));

export function visibleTrainingPrograms(filter: TrainingFilter) {
  return TRAINING_PROGRAMS.filter(program => filter === 'ALL' || filter === program.group);
}
