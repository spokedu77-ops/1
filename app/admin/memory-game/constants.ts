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
  { id: 'odd_jump_fwd_even_jump_back', label: '홀수 → 앞으로 점프 / 짝수 → 뒤로 점프' },
  { id: 'big_clap', label: '5 이상 → 박수 / 5 미만 → 만세' },
];

export const MODES: Record<string, { id: string; title: string; en: string; icon: string; accent: string; tag: string; desc: string; levels: Array<{ id: number; name: string; enName: string; desc: string }> }> = {
  basic: {
    id: 'basic', title: '반응 인지', en: 'Reactive Cognition', icon: '⚡', accent: '#3B82F6',
    tag: '순발력 · 지각 훈련',
    desc: '화면 신호를 보는 순간, 판단하고 즉시 움직입니다.',
    levels: [
      { id: 1, name: '1번', enName: 'Quad Color', desc: '사분할 색 — Think와 동일 2×2 격자에서 한 칸만 강조됩니다. 강조된 칸 색에 맞는 콘으로 달립니다.' },
      { id: 2, name: '2번', enName: 'Full-Screen Color', desc: '전면 색 — 화면 전체가 한 가지 색으로 채워집니다. 그 색에 맞는 콘으로 이동합니다.' },
      { id: 3, name: '3번', enName: 'Variant Color (1)', desc: '변형 색지각 1단계 — 설정에서 고른 테마(과일·탈 것·감정·동물) 이미지가 가로 3패널에 나옵니다. 그 색에 맞는 콘으로 이동합니다. 연속으로 같은 그림은 나오지 않습니다.' },
      { id: 4, name: '4번', enName: 'Variant Color (2)', desc: '변형 색지각 2단계 — 같은 테마. 가로 3칸 중 일부만 이미지(나머지 흰 칸). 색 한 가지로 답합니다.' },
      { id: 5, name: '5번', enName: 'Variant Color (3)', desc: '변형 색지각 3단계 — 같은 테마에서 서로 다른 이미지 2패널. 두 색 콘을 동시에 한 발씩 밟습니다. 같은 쌍이 연속으로 나오지 않습니다.' },
      { id: 6, name: '6번', enName: 'Spatial Orientation', desc: '공간 방향 — 화살표 방향을 보고 해당 방향 콘으로 즉시 이동합니다.' },
      { id: 7, name: '7번', enName: 'Conditional Number', desc: '조건부 수 판단 — 숫자와 선생님이 정한 규칙에 따라 행동합니다.' },
    ],
  },
  stroop: {
    id: 'stroop', title: '스트룹 과제', en: 'Stroop Task', icon: '🧠', accent: '#A855F7',
    tag: '억제 제어 · 인지 유연성',
    desc: '배경은 기본 흰색입니다. 화살표·글자 과제에서 규칙에 따라 방향·색·의미를 말합니다.',
    levels: [
      { id: 1, name: '1번', enName: 'Arrow Dir / Arrow Fill', desc: '화살표 방향 스트룹 / 화살표 색상 스트룹 — 배경 흰색. 신호마다 「방향 말하기」와 「채움 색 말하기」가 무작위로 바뀝니다.' },
      { id: 2, name: '2번', enName: 'Arrow + BG', desc: '화살표 스트룹(배경 간섭) — 1번과 동일하나 화면 전체 배경에 색이 깔립니다.' },
      { id: 3, name: '3번', enName: 'Arrow Rev Dir / Rev Fill', desc: '화살표 역방향 스트룹 / 역색상 스트룹 — 1번의 역규칙(힌트가 반대 차원). 배경 흰색.' },
      { id: 4, name: '4번', enName: 'Arrow Rev + BG', desc: '화살표 역스트룹(배경 간섭) — 3번과 동일하나 배경에 색이 깔립니다.' },
      { id: 5, name: '5번', enName: 'Word Meaning / Word Ink', desc: '글자 의미 스트룹 / 글자 색상 스트룹 — 배경 흰색. 글자 뜻(의미) 또는 잉크 색을 말합니다(신호마다 무작위).' },
      { id: 6, name: '6번', enName: 'Word + BG', desc: '글자 스트룹(배경 간섭) — 잉크 색을 말하되, 배경색이 추가로 겹칩니다.' },
      { id: 7, name: '7번', enName: 'Word Rev Meaning / Rev Ink', desc: '글자 의미 역스트룹 / 글자 색상 역스트룹 — 5번의 역규칙. 배경 흰색.' },
      { id: 8, name: '8번', enName: 'Missing Color', desc: '역스트룹(배경 간섭 — 나오지 않은 색) — 글자·잉크·배경 세 가지 색에 나오지 않은 네 번째 색 이름을 말합니다.' },
    ],
  },
  simon: {
    id: 'simon', title: '사이먼 효과', en: 'Simon Effect', icon: '◈', accent: '#EC4899',
    tag: '공간 위치 · 색 반응',
    desc: '원·삼각형·사각형이 화면 어디에나 하나씩 나타납니다. 안을 채운 색에 맞는 콘으로 이동합니다.',
    levels: [
      { id: 1, name: '1번', enName: 'Pole Shape & Position', desc: '원·삼각형·사각형 중 하나가 좌·우·상·하 양극단을 순서대로 번갈아 배치됩니다(색·도형은 무작위). 약 25% 크기로 채워지며, 채운 색 콘으로 달립니다.' },
      { id: 2, name: '2번', enName: 'Pole Arrows', desc: '↑↓←→ 화살표가 양극단을 순서대로 번갈아 나타납니다. 화살표가 가리키는 방향 콘으로 이동합니다.' },
    ],
  },
  flanker: {
    id: 'flanker', title: '플랭커', en: 'Flanker', icon: '◎', accent: '#6366F1',
    tag: '방해 자극 · 목표 색 선택',
    desc: '가로로 나란히 다섯 개의 원이 보입니다. 가운데(세 번째) 원의 색에 맞는 콘으로만 이동합니다.',
    levels: [
      { id: 1, name: '1번', enName: 'Uniform Flankers', desc: '다섯 원이 모두 같은 색입니다. 가운데 색 콘으로 달립니다.' },
      { id: 2, name: '2번', enName: 'Grouped Flankers', desc: '양끝(1·5번)과 가운데 셋(2·3·4번)끼리 각각 같은 색입니다. 답은 항상 가운데(3번) 원의 색입니다.' },
      { id: 3, name: '3번', enName: 'Random Flankers', desc: '다섯 원 색이 각각 무작위입니다. 가운데 원 색만 보고 콘을 고릅니다.' },
      { id: 4, name: '4번', enName: 'Mixed Size & Color', desc: '다섯 원의 크기·색이 서로 다르게(한 줄, 스크롤 없음) 나옵니다. 가운데 원 색 콘으로 달립니다.' },
    ],
  },
  gonogo: {
    id: 'gonogo', title: 'Go / No-Go', en: 'Go / No-Go', icon: '⏯', accent: '#14B8A6',
    tag: '반응 억제 · Go와 멈춤',
    desc: '신호에 따라 이동(Go)할지 제자리(No-Go)할지 곧바로 구분합니다. 난이도마다 규칙(색·도형·동작·이중)이 다릅니다.',
    levels: [
      { id: 1, name: '1번', enName: 'Color Go/No-Go', desc: '색 기반 — 빨강·파랑·노랑은 Go(이동), 초록은 No-Go(멈춤).' },
      { id: 2, name: '2번', enName: 'Shape Go/No-Go', desc: '도형 기반 — 동그라미는 Go, 세모는 No-Go.' },
      { id: 3, name: '3번', enName: 'Action Go/No-Go', desc: '동작 기반 — 화살표는 이동(Go), X표는 멈춤(No-Go).' },
      { id: 4, name: '4번', enName: 'Dual Rule', desc: '이중 규칙 — 빨강 동그라미는 Go, 빨강 세모는 No-Go.' },
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
      { id: 1, name: '1번', enName: 'Color-Number Integration', desc: '색깔·숫자 통합 — 배경 색 콘으로 이동한 뒤, 숫자만큼 반복 동작(터치·점프 등)을 합니다.' },
      { id: 2, name: '2-1번', enName: 'Color & Arrow', desc: '색깔·화살표 — 파랑/빨강 콘 이동 후, 화면 좌·우 화살표 방향 콘으로 한 번 더 이동합니다. 조합은 무작위입니다.' },
    ],
  },
  flow: {
    id: 'flow', title: '플로우', en: 'Flow Mode', icon: '🌌', accent: '#06B6D4',
    tag: '몰입 러닝 · 반응 전환',
    desc: '우주 러닝 FLOW를 SPOMOVE에서 바로 실행합니다.',
    levels: [
      { id: 1, name: '1번', enName: 'Flow Program', desc: 'FLOW 프로그램 — 시작·레벨·휴식을 포함한 전체 시퀀스를 진행합니다.' },
    ],
  },
  challenge: {
    id: 'challenge', title: '챌린지', en: 'Challenge', icon: '🥁', accent: '#14B8A6',
    tag: '리듬 · 방향 반응',
    desc: '스튜디오에서 설정한 BGM·그리드 기준 리듬 챌린지를 SPOMOVE에서 실행합니다.',
    levels: [
      { id: 1, name: '1번', enName: 'Rhythm Program', desc: '리듬 프로그램 — 4개 구간 리듬 시퀀스를 끝까지 진행합니다.' },
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
