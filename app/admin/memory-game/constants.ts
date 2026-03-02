/**
 * SPOKEDU 메모리게임 — 상수 정의
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

export const ACTIONS = [
  { id: 'clap', label: '박수', voice: '박수', emoji: '👏' },
  { id: 'hurray', label: '만세', voice: '만세', emoji: '🙌' },
  { id: 'jump', label: '점프', voice: '점프', emoji: '⬆️' },
  { id: 'hop', label: '한 발 점프', voice: '한 발 점프', emoji: '🦶' },
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
      { id: 2, name: '공간 방향 지각', enName: 'Spatial Orientation', desc: '화살표 방향을 보고 해당 방향으로 즉시 이동합니다.' },
      { id: 3, name: '조건부 수 판단', enName: 'Conditional Number', desc: '숫자를 보고 선생님이 정한 규칙대로 행동합니다.' },
    ],
  },
  stroop: {
    id: 'stroop', title: '스트룹 과제', en: 'Stroop Task', icon: '🧠', accent: '#A855F7',
    tag: '억제 제어 · 인지 유연성',
    desc: '글자와 색깔이 서로 충돌합니다. 뇌의 자동 반응을 억제하고 올바르게 판단하세요.',
    levels: [
      { id: 1, name: '색 명명', enName: 'Color Naming', desc: '"빨강"이 파란색으로 칠해져 있다면 → "파랑"이라고 말합니다. 글자에 칠해진 색이 무엇인지를 말하세요.' },
      { id: 2, name: '배경 간섭', enName: 'Background Interference', desc: '배경색이 추가되어 방해합니다. 글자에 칠해진 색만 말하세요.' },
      { id: 3, name: '역 스트룹', enName: 'Reverse Stroop', desc: '이번엔 반대! 칠해진 색은 무시하고 글자에 쓰인 내용을 그대로 말합니다.' },
    ],
  },
  spatial: {
    id: 'spatial', title: '순차 기억', en: 'Sequential Memory', icon: '🎨', accent: '#22C55E',
    tag: '작업기억 · 순서 재생',
    desc: '색깔이 하나씩 차례로 나타납니다. 머릿속에 순서를 담아 재현하세요.',
    levels: [
      { id: 1, name: '2항 기억', enName: '2-Item Recall', desc: '색깔 2개가 1초씩 나옵니다. 끝나면 순서대로 말합니다.' },
      { id: 2, name: '3항 기억', enName: '3-Item Recall', desc: '색깔 3개가 1초씩 나옵니다. 순서대로 말합니다.' },
      { id: 3, name: '10항 연속 기억', enName: '10-Item Serial Recall', desc: '색깔이 무작위로 10번 나옵니다. 모두 기억한 뒤 선생님이 정답을 공개합니다.' },
      { id: 4, name: '역방향 기억', enName: 'Backward Recall', desc: '색깔 4개가 나옵니다. 끝나면 거꾸로 말합니다. (마지막→처음 순)' },
    ],
  },
  team: {
    id: 'team', title: '팀 대결', en: 'Team Battle', icon: '⚔️', accent: '#F43F5E',
    tag: '경쟁 · 협동 · 동기부여',
    desc: '두 팀이 같은 신호에 먼저 반응합니다. 선생님이 득점을 판정해 승부를 가립니다.',
    levels: [
      { id: 1, name: '색 신호', enName: 'Color Signal', desc: '색깔 신호에 먼저 달려간 팀이 득점.' },
      { id: 2, name: '스트룹', enName: 'Stroop', desc: '스트룹 신호를 먼저 판단한 팀이 득점.' },
      { id: 3, name: '이중과제', enName: 'Dual Task', desc: '색+동작을 먼저 수행한 팀이 득점.' },
    ],
  },
  nback: {
    id: 'nback', title: 'N-Back', en: 'N-Back Task', icon: '🔁', accent: '#06B6D4',
    tag: '작업기억 · 업데이트',
    desc: 'N개 전에 나온 색깔과 지금 색깔이 같으면 반응하세요. 뇌의 작업기억을 직접 단련합니다.',
    levels: [
      { id: 1, name: '1-Back', enName: '1-Back', desc: '바로 직전에 나온 색과 지금 색이 같으면 손을 드세요.' },
      { id: 2, name: '2-Back', enName: '2-Back', desc: '2개 전에 나온 색과 지금 색이 같으면 손을 드세요.' },
      { id: 3, name: '3-Back', enName: '3-Back', desc: '3개 전에 나온 색과 지금 색이 같으면 손을 드세요.' },
    ],
  },
  dual: {
    id: 'dual', title: '이중 과제', en: 'Dual Task', icon: '🔀', accent: '#F97316',
    tag: '분산 주의 · 복합 실행',
    desc: '두 가지 정보를 동시에 처리해 하나의 통합된 행동을 수행합니다.',
    levels: [
      { id: 1, name: '색-수 통합', enName: 'Color-Number Integration', desc: '해당 색 콘으로 달린 뒤, 화면 숫자만큼 콘을 터치합니다.' },
      { id: 2, name: '색-동작 통합', enName: 'Color-Action Integration', desc: '해당 색 콘 위치에서 화면에 나오는 동작을 수행합니다.' },
      { id: 3, name: '스트룹-동작 통합', enName: 'Stroop-Action Integration', desc: '스트룹 과제로 색을 판단해 이동하고, 동작까지 수행합니다.' },
    ],
  },
};

export const STUDENTS_KEY = 'spokedu_students_v1';
export const STUDENT_COLORS = [
  '#F97316', '#3B82F6', '#22C55E', '#A855F7',
  '#EF4444', '#FACC15', '#06B6D4', '#EC4899',
];

export const HISTORY_KEY = 'spokedu_history_v1';
export const MAX_HISTORY = 200;

export const NBACK_ROUNDS = 20;
export const NBACK_SHOW_MS = 1800;
export const NBACK_GAP_MS = 600;

export const SPEED_PRESETS = [
  { label: '미취학', sub: '5~7세', value: 5.0, emoji: '🐥', color: '#F59E0B' },
  { label: '초등 저학년', sub: '8~10세', value: 4.0, emoji: '🌱', color: '#10B981' },
  { label: '초등 고학년', sub: '11~13세', value: 3.0, emoji: '🏃', color: '#3B82F6' },
  { label: '중고등·성인', sub: '14~40세', value: 2.0, emoji: '⚡', color: '#8B5CF6' },
  { label: '시니어', sub: '60세 이상', value: 4.5, emoji: '🌿', color: '#EC4899' },
];
