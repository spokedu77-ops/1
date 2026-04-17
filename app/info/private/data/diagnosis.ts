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
  { value: 'bike', label: '자전거·균형차 등 이동 능력' },
  { value: 'strength', label: '기초 체력·근력' },
] as const;

/** Q3: 우리 아이가 어떻게 성장하길 바라시나요? */
export const Q3_OPTIONS = [
  { value: 'confidence', label: '자신감이 쑥쑥 자랐으면 좋겠어요' },
  { value: 'think', label: '스스로 생각하고 움직였으면 좋겠어요' },
  { value: 'fitness', label: '체력이 눈에 띄게 튼튼해졌으면 좋겠어요' },
  { value: 'habit', label: '운동을 평생 좋아하는 아이가 되었으면 좋겠어요' },
  { value: 'social', label: '친구와 협동하며 놀 수 있게 되었으면 좋겠어요' },
] as const;

/** Q4: 우리 아이 연령대 (선택, 단일 선택 권장) */
export const Q4_OPTIONS = [
  { value: 'preschool', label: '유아 (만 4~6세)' },
  { value: 'lower', label: '초등 저학년 (1~3학년)' },
  { value: 'upper', label: '초등 고학년 (4~6학년)' },
  { value: 'teen', label: '청소년 (중·고등)' },
] as const;

/** Q1 value → 전문가 솔루션 문구 */
export const Q1_FOCUS_MAP: Record<string, string> = {
  shy: '라포 형성 및 자발적 흥미 유발 (Play 기반 적용)',
  focus: '인지 결합형 몰입 유도 (Think 기반 적용)',
  goal: '목표 지향적 구조화 설계 (단기 성취 달성)',
  energy: '에너지의 긍정적 발산 및 통제력 훈련 병행',
};

/** Q1 조합 → 세부 접근 문구 (있으면 사용, 없으면 Q1_FOCUS_MAP만) */
export const Q1_COMBO_MAP: Record<string, string> = {
  'shy+focus': '라포 형성 후 인지 결합형 활동 단계적 도입',
  'focus+goal': '짧은 목표 단위로 성취감을 주며 집중 시간 연장',
  'shy+goal': '부담 없는 작은 성취부터 시작해 목표로 확장',
  'energy+goal': '명확한 룰과 목표 안에서 에너지 발산 유도',
};

/** Q1 주 선택값 → 진단 유형 라벨 */
export const DIAGNOSIS_TYPE_LABELS: Record<string, string> = {
  shy: 'Play·라포 우선형',
  focus: 'Think·몰입 유도형',
  goal: '목표 달성형',
  energy: '에너지 발산·통제형',
};

/** Q2 value → 커리큘럼 포인트 문구 */
export const Q2_CURRICULUM_HINT: Record<string, string> = {
  jump: '도약·리듬 활동으로 신체 리듬감과 타이밍을 키웁니다.',
  balance: '밸런스 훈련으로 안정감과 자세 조절력을 높입니다.',
  run: '민첩성·반응 훈련으로 움직임 속도와 판단력을 기릅니다.',
  ball: '공 놀이·협응 활동으로 눈과 손발 협응을 발달시킵니다.',
  bike: '자전거·균형차 프로그램으로 이동 능력과 도전심을 키웁니다.',
  strength: '기초 체력·근력 활동으로 튼튼한 몸을 만듭니다.',
};

/** Q3 value → 기대 변화 문구 */
export const Q3_GROWTH_HINT: Record<string, string> = {
  confidence: '작은 성취 경험을 쌓아 자신감을 키웁니다.',
  think: '스스로 판단하고 움직이는 활동으로 사고력을 기릅니다.',
  fitness: '꾸준한 체력 활동으로 기초 체력을 다집니다.',
  habit: '재미있는 경험을 통해 운동 습관을 만들어 갑니다.',
  social: '협동·차례 활동으로 사회성을 발달시킵니다.',
};

export type DiagnosisResult = {
  typeLabel: string;
  focusLines: string[];
  curriculumHints: string[];
  growthHints: string[];
  /** 상담 폼·접수 본문에 붙는 전체 진단 내역(선택 문항 + 솔루션 요약) */
  summaryForForm: string;
};

function labelsForSelected(
  values: string[],
  options: readonly { value: string; label: string }[]
): string[] {
  const out: string[] = [];
  for (const v of values) {
    const opt = options.find((o) => o.value === v);
    if (opt) out.push(opt.label);
  }
  return out;
}

function pushBullets(lines: string[], labels: string[]) {
  if (labels.length === 0) {
    lines.push('· (선택 없음)');
    return;
  }
  for (const l of labels) {
    lines.push(`· ${l}`);
  }
}

/**
 * 선택 결과로 진단 유형 라벨·접근 방향·추천 포인트·상담 폼용 요약 생성
 */
export function getDiagnosisResult(
  q1: string[],
  q2: string[],
  q3: string[],
  q4: string[]
): DiagnosisResult | null {
  if (q1.length === 0) return null;

  const q1Key = [...q1].sort().join('+');
  const comboLine = Q1_COMBO_MAP[q1Key];
  const focusLines = comboLine
    ? [comboLine]
    : q1.map((v) => Q1_FOCUS_MAP[v]).filter(Boolean);
  const primary = q1[0];
  const typeLabel = DIAGNOSIS_TYPE_LABELS[primary] ?? '맞춤형';

  const curriculumHints = q2
    .map((v) => Q2_CURRICULUM_HINT[v])
    .filter(Boolean);
  const growthHints = q3
    .map((v) => Q3_GROWTH_HINT[v])
    .filter(Boolean);

  const q1Labels = labelsForSelected(q1, Q1_OPTIONS);
  const q2Labels = labelsForSelected(q2, Q2_OPTIONS);
  const q3Labels = labelsForSelected(q3, Q3_OPTIONS);
  const q4Labels = labelsForSelected(q4, Q4_OPTIONS);

  const formLines: string[] = [];
  formLines.push('[선택한 진단 문항]');
  formLines.push('');
  formLines.push('Q1. 우리 아이의 현재 가장 큰 고민은?');
  pushBullets(formLines, q1Labels);
  formLines.push('');
  formLines.push('Q2. 어떤 신체 능력을 키워주고 싶으신가요?');
  pushBullets(formLines, q2Labels);
  formLines.push('');
  formLines.push('Q3. 우리 아이가 어떻게 성장하길 바라시나요?');
  pushBullets(formLines, q3Labels);
  formLines.push('');
  formLines.push('Q4. 우리 아이 연령대');
  pushBullets(formLines, q4Labels);
  formLines.push('');
  formLines.push('[솔루션 분석 요약]');
  formLines.push(`진단 유형: ${typeLabel}`);
  formLines.push('');
  formLines.push('주요 접근 방향');
  pushBullets(formLines, focusLines);
  if (curriculumHints.length > 0) {
    formLines.push('');
    formLines.push('추천 커리큘럼 포인트');
    pushBullets(formLines, curriculumHints);
  }
  if (growthHints.length > 0) {
    formLines.push('');
    formLines.push('기대하는 변화');
    pushBullets(formLines, growthHints);
  }

  const summaryForForm = formLines.join('\n');

  return {
    typeLabel,
    focusLines,
    curriculumHints,
    growthHints,
    summaryForForm,
  };
}
