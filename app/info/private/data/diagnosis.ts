/** Q1: 우리 아이의 현재 가장 큰 고민 (필수, 다중 선택) */
export const Q1_OPTIONS = [
  { value: 'shy', label: '신체 활동 자체에 소극적이고 방어적이에요' },
  { value: 'focus', label: '집중하는 시간이 짧고 금방 흥미를 잃어요' },
  { value: 'goal', label: '두발자전거 타기 등 명확하게 달성하고 싶은 목표가 있어요' },
  { value: 'energy', label: '에너지가 넘쳐서 올바른 방향으로 발산하게 해주고 싶어요' },
] as const;

/** Q2: 어떤 신체 능력을 키워주고 싶으신가요? */
export const Q2_OPTIONS = [
  { value: 'jump', label: '도약 및 리듬감 (줄넘기 등)' },
  { value: 'balance', label: '전신 밸런스와 안정감' },
  { value: 'run', label: '민첩성과 반응 속도' },
  { value: 'ball', label: '눈과 손발의 협응력 (공 다루기)' },
] as const;

/** Q3: 우리 아이가 어떻게 성장하길 바라시나요? */
export const Q3_OPTIONS = [
  { value: 'confidence', label: '자신감이 쑥쑥 자랐으면 좋겠어요' },
  { value: 'think', label: '스스로 생각하고 움직였으면 좋겠어요' },
  { value: 'fitness', label: '체력이 눈에 띄게 튼튼해졌으면 좋겠어요' },
  { value: 'habit', label: '운동을 평생 좋아하는 아이가 되었으면 좋겠어요' },
] as const;

/** Q1 value → 전문가 솔루션 문구 */
export const Q1_FOCUS_MAP: Record<string, string> = {
  shy: '라포 형성 및 자발적 흥미 유발 (Play 기반 적용)',
  focus: '인지 결합형 몰입 유도 (Think 기반 적용)',
  goal: '목표 지향적 구조화 설계 (단기 성취 달성)',
  energy: '에너지의 긍정적 발산 및 통제력 훈련 병행',
};
