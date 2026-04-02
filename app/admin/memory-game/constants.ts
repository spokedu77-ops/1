/**
 * SPOKEDU SPOMOVE — 상수 정의
 */

export const COLORS = [
  { id: 'red', name: '빨강', bg: '#EF4444', text: '#fff', symbol: '●' },
  { id: 'blue', name: '파랑', bg: '#3B82F6', text: '#fff', symbol: '■' },
  { id: 'green', name: '초록', bg: '#22C55E', text: '#fff', symbol: '▲' },
  { id: 'yellow', name: '노랑', bg: '#FACC15', text: '#111', symbol: '◆' },
];

export const ARROWS = [
  { id: 'up', label: '위', icon: '↑', voice: '위로' },
  { id: 'down', label: '아래', icon: '↓', voice: '아래로' },
  { id: 'left', label: '왼쪽', icon: '←', voice: '왼쪽으로' },
  { id: 'right', label: '오른쪽', icon: '→', voice: '오른쪽으로' },
];

/** 이중과제 2-1: 파랑·빨강만, 좌·우 화살표만 */
export const DUAL_TWO_COLORS = COLORS.filter((c) => c.id === 'red' || c.id === 'blue');
export const DUAL_LR_ARROWS = ARROWS.filter((a) => a.id === 'left' || a.id === 'right');

export const ACTIONS = [
  { id: 'clap', label: '박수', voice: '박수', emoji: '👏' },
  { id: 'jump', label: '점프', voice: '점프', emoji: '⬆️' },
  { id: 'squat', label: '스쿼트', voice: '스쿼트', emoji: '🦵' },
  { id: 'spin', label: '제자리 한 바퀴', voice: '한 바퀴', emoji: '🔄' },
  { id: 'cross', label: '팔 교차', voice: '팔 교차', emoji: '✖️' },
];

export const STROOP_COLORS = [
  { name: '빨강', hex: '#EF4444' },
  { name: '파랑', hex: '#3B82F6' },
  { name: '초록', hex: '#22C55E' },
  { name: '노랑', hex: '#FACC15' },
];

export const NUMBERS = Array.from({ length: 9 }, (_, i) => ({
  label: String(i + 1),
  voice: ['일', '이', '삼', '사', '오', '육', '칠', '팔', '구'][i],
}));

export const MEMORY_ROUNDS = 10;

export const NUMBER_RULES = [
  { id: 'odd_left', label: '홀수 → 왼쪽 점프 / 짝수 → 오른쪽 점프' },
  { id: 'odd_right', label: '홀수 → 오른쪽 점프 / 짝수 → 왼쪽 점프' },
  { id: 'odd_jump', label: '홀수 → 앞으로 점프 / 짝수 → 제자리' },
  { id: 'big_clap', label: '5 이상 → 박수 / 5 미만 → 만세' },
];

export const MODES: Record<string, { id: string; title: string; en: string; icon: string; accent: string; tag: string; desc: string; levels: Array<{ id: number; name: string; enName: string; desc: string }> }> = {
  basic: {
    id: 'basic', title: '반응 인지', en: 'Reactive Cognition', icon: '⚡', accent: '#3B82F6',
    tag: '순발력 · 지각 훈련',
    desc: '화면 신호를 보는 순간, 판단하고 즉시 움직입니다.',
    levels: [
      { id: 1, name: '색 지각', enName: 'Color Perception', desc: '화면 전체가 바뀌는 색깔을 보고 해당 콘으로 즉시 달립니다.' },
      { id: 2, name: '변형 색지각', enName: 'Variant Color Perception', desc: '좌·우에 같은 과일이 나타납니다. 해당 색 콘으로 즉시 이동합니다. 연속으로 같은 과일은 나오지 않습니다.' },
      { id: 3, name: '공간 방향 지각', enName: 'Spatial Orientation', desc: '화살표 방향을 보고 해당 방향으로 즉시 이동합니다.' },
      { id: 4, name: '조건부 수 판단', enName: 'Conditional Number', desc: '숫자를 보고 선생님이 정한 규칙대로 행동합니다.' },
    ],
  },
  stroop: {
    id: 'stroop', title: '스트룹 과제', en: 'Stroop Task', icon: '🧠', accent: '#A855F7',
    tag: '억제 제어 · 인지 유연성',
    desc: '글자와 색깔이 서로 충돌합니다. 뇌의 자동 반응을 억제하고 올바르게 판단하세요.',
    levels: [
      { id: 1, name: '역 스트룹', enName: 'Reverse Stroop', desc: '칠해진 색은 무시하고 글자에 쓰인 내용을 그대로 말합니다.' },
      { id: 2, name: '색 명명', enName: 'Color Naming', desc: '"빨강"이 파란색으로 칠해져 있다면 → "파랑"이라고 말합니다. 글자에 칠해진 색이 무엇인지를 말하세요.' },
      { id: 3, name: '배경 간섭', enName: 'Background Interference', desc: '배경색이 추가되어 방해합니다. 글자에 칠해진 색만 말하세요.' },
    ],
  },
  spatial: {
    id: 'spatial', title: '순차 기억', en: 'Sequential Memory', icon: '🎨', accent: '#22C55E',
    tag: '작업기억 · 순서 재생',
    desc: '색깔이 하나씩 차례로 나타납니다. 머릿속에 순서를 담아 재현하세요.',
    levels: [
      { id: 1, name: '1번', enName: '3항 기억', desc: '색깔 3개가 1초씩 나온 뒤 순서대로 말합니다.' },
      { id: 2, name: '2번', enName: '5항 기억', desc: '색깔 5개가 1초씩 나온 뒤 순서대로 말합니다.' },
      { id: 3, name: '3번', enName: '10항 기억', desc: '색깔이 무작위 10번 나옵니다. 기억한 뒤 선생님이 정답 공개.' },
      { id: 4, name: '4번', enName: '색깔-번호 기억', desc: '색깔 배경에 번호(1~10)가 하나씩 나옵니다. 10번 모두 본 뒤, 번호별 색깔을 맞혀보세요.' },
      { id: 5, name: '5번', enName: '색깔-번호 전체 공개', desc: '색깔 배경에 번호(1~10)가 하나씩 나옵니다. 10번 모두 본 뒤, 전체 정답을 한 화면에 공개합니다.' },
    ],
  },
  dual: {
    id: 'dual', title: '이중 과제', en: 'Dual Task', icon: '🔀', accent: '#F97316',
    tag: '분산 주의 · 복합 실행',
    desc: '두 가지 정보를 동시에 처리해 하나의 통합된 행동을 수행합니다.',
    levels: [
      { id: 1, name: '1번 색깔·숫자 통합', enName: 'Color-Number Integration', desc: '화면 배경 색에 맞는 콘으로 이동한 뒤, 숫자만큼 반복 동작(터치·점프 등)을 합니다.' },
      { id: 2, name: '2-1번 색깔·화살표', enName: 'Color & Arrow', desc: '파랑 또는 빨강 콘으로 이동한 뒤, 화면 화살표(왼쪽·오른쪽) 방향으로 이동합니다. 색과 방향은 매번 무작위입니다.' },
    ],
  },
  flow: {
    id: 'flow', title: '플로우', en: 'Flow Mode', icon: '🌌', accent: '#06B6D4',
    tag: '몰입 러닝 · 반응 전환',
    desc: '우주 러닝 FLOW를 SPOMOVE에서 바로 실행합니다.',
    levels: [
      { id: 1, name: 'FLOW 프로그램', enName: 'Flow Program', desc: '시작-레벨-휴식을 포함한 FLOW 전체 시퀀스를 진행합니다.' },
    ],
  },
};

export const STUDENTS_KEY = 'spokedu_students_v1';
export const STUDENT_COLORS = [
  '#F97316', '#3B82F6', '#22C55E', '#A855F7',
  '#EF4444', '#FACC15', '#06B6D4', '#EC4899',
];

export const SPEED_PRESETS = [
  { label: '미취학', sub: '5~7세', value: 5.0, emoji: '🐥', color: '#F59E0B' },
  { label: '초등 저학년', sub: '8~10세', value: 4.0, emoji: '🌱', color: '#10B981' },
  { label: '초등 고학년', sub: '11~13세', value: 3.0, emoji: '🏃', color: '#3B82F6' },
  { label: '중고등·성인', sub: '14~40세', value: 2.0, emoji: '⚡', color: '#8B5CF6' },
  { label: '시니어', sub: '60세 이상', value: 4.5, emoji: '🌿', color: '#EC4899' },
];
