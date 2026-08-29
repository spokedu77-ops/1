/** Scoring Manual v0.1 — UI labels SSOT for Field Capture v0.1 */

export const MAIN_ACTIVITIES = [
  { value: 'basic_movement', label: '기본움직임' },
  { value: 'spomove', label: 'SPOMOVE' },
  { value: 'object_control', label: '조작운동' },
  { value: 'sport', label: '스포츠' },
  { value: 'cooperative', label: '협력활동' },
  { value: 'other', label: '기타' },
] as const;

export const OPPORTUNITY_BANDS = [
  { value: null as null, label: '평가하지 않음' },
  { value: 'one' as const, label: '1회' },
  { value: 'two' as const, label: '2회' },
  { value: 'three_plus' as const, label: '3회 이상' },
];

export const PARTICIPATION_LEVELS = [
  { value: 0, label: '0', title: '진입 어려움', desc: '활동 진입이 관찰되지 않음' },
  { value: 1, label: '1', title: '관찰', desc: '자극·활동에 주의' },
  { value: 2, label: '2', title: '지원 참여', desc: '지원 후 움직임 참여' },
  { value: 3, label: '3', title: '독립 시도', desc: '독립적 움직임 시작' },
  { value: 4, label: '4', title: '지속 참여', desc: '반복·지속적 독립 참여' },
];

export const SUPPORT_LEVELS = [
  { value: 0, label: 'I', title: 'Independent', desc: '추가 지원 없음' },
  { value: 1, label: 'V', title: 'Verbal', desc: '언어 안내' },
  { value: 2, label: 'G/M', title: 'Gesture/Model', desc: '제스처·시범' },
  { value: 3, label: 'PP', title: 'Partial Physical', desc: '부분 신체지원' },
  { value: 4, label: 'FP', title: 'Full Physical', desc: '전적 신체지원' },
];

export const INDEPENDENT_INITIATION = [
  { value: 0, label: '0', title: '없음', desc: '독립적 시작 없음' },
  { value: 1, label: '1', title: '1회', desc: '' },
  { value: 2, label: '2', title: '2회+', desc: '동일 활동 2회 이상' },
  { value: 3, label: '3', title: '전반', desc: '활동 전반 반복' },
];

export const SELF_REENGAGEMENT = [
  { value: 'null' as const, label: '해당 없음', desc: '재참여 관찰기회 없음' },
  { value: 'false' as const, label: '없음', desc: '이탈 후 자발적 복귀 없음' },
  { value: 'true' as const, label: '있음', desc: '지시 없이 다시 참여' },
];

export const FRW_SECONDS = [
  { value: 6, label: '6초' },
  { value: 5, label: '5초' },
  { value: 4, label: '4초' },
  { value: 3, label: '3초' },
  { value: 2, label: '2초' },
  { value: 1, label: '1초 Challenge' },
];

export const FRW_STATUS = [
  { value: 'exploratory', label: 'Exploratory', desc: '안정성 판단 어려움' },
  { value: 'observed_stable', label: 'Observed Stable', desc: '3회+ 참여기회에서 안정' },
  { value: 'not_determined', label: 'Not Determined', desc: '당일 판단 보류' },
];

export const MOVEMENT_DOMAINS = [
  {
    id: 'locomotor',
    label: '기본이동',
    subtags: ['걷기', '달리기', '점프', '호핑', '사이드스텝', '지그재그', '방향전환', '기타'],
  },
  {
    id: 'body_control',
    label: '신체조절',
    subtags: ['균형', '자세조절', '공간이동', '정지', '체중이동', '기타'],
  },
  {
    id: 'visual_response',
    label: '시지각 반응',
    subtags: ['색상', '위치', '방향', '선택', '연속반응', '기억', '억제', '기타'],
  },
  {
    id: 'object_control',
    label: '조작운동',
    subtags: ['던지기', '받기', '굴리기', '차기', '치기', '드리블', '목표물', '기타'],
  },
  {
    id: 'sport_challenge',
    label: '스포츠·도전',
    subtags: ['농구', '티볼', '피클볼', '컬링', '골프', '양궁', '기타 뉴스포츠', '기타'],
  },
  {
    id: 'social_movement',
    label: '함께 움직이기',
    subtags: ['차례', '파트너', '협동', '팀 과제', '공동목표', '기타'],
  },
] as const;

export const ABSENCE_REASONS = [
  { value: 'institution_schedule', label: '기관 일정' },
  { value: 'personal', label: '개인 사정' },
  { value: 'health', label: '건강' },
  { value: 'other', label: '기타' },
  { value: 'unknown', label: '미확인' },
];
