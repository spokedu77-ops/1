/** Q1: 고민 (필수 1개 이상, 다중 선택) */
export const Q1_OPTIONS = [
  { value: 'concern_confidence', label: '운동을 어려워하거나 자신감이 부족해요' },
  { value: 'concern_focus', label: '집중력이 짧고 쉽게 흥미를 잃어요' },
  { value: 'concern_skill', label: '특정 종목(줄넘기, 자전거, 공놀이 등)을 배우고 싶어요' },
  { value: 'concern_stamina', label: '체력이나 활동량이 부족한 것 같아요' },
] as const;

/** Q2: 변화 방향 (다중 선택) */
export const Q2_OPTIONS = [
  { value: 'direction_confidence', label: '운동에 대한 자신감을 키우고 싶어요' },
  { value: 'direction_fitness', label: '기초 체력과 신체 기능을 향상시키고 싶어요' },
  { value: 'direction_mastery', label: '한 가지 종목을 제대로 배워 성취감을 느끼게 하고 싶어요' },
  { value: 'direction_habit', label: '꾸준히 운동하는 습관을 만들고 싶어요' },
] as const;

/** Q3: 운동 수준 (다중 선택 — 복합 이해·최고 난이도 기준 보조) */
export const Q3_OPTIONS = [
  { value: 'level_beginner', label: '거의 처음 시작하는 수준이에요' },
  { value: 'level_basic', label: '기본적인 움직임은 가능하지만 익숙하지 않아요' },
  { value: 'level_some', label: '간단한 운동이나 종목 경험이 있어요' },
  { value: 'level_skilled', label: '특정 종목을 어느 정도 할 수 있어요' },
] as const;

/** Q4: 수업 형태 (다중 선택) */
export const Q4_OPTIONS = [
  { value: 'format_one', label: '1:1 맞춤 수업' },
  { value: 'format_group', label: '친구/형제와 함께 소그룹' },
  { value: 'format_recommend', label: '상황에 따라 추천받고 싶어요' },
] as const;

/** Q5: 중요 요소 (다중 선택) */
export const Q5_OPTIONS = [
  { value: 'priority_fun', label: '아이가 즐겁게 참여하는 것' },
  { value: 'priority_skill', label: '눈에 보이는 실력 향상' },
  { value: 'priority_system', label: '체계적인 지도 방식' },
  { value: 'priority_feedback', label: '강사와의 소통 및 피드백' },
] as const;

export type ProgramTypeId = 'foundation' | 'immersion' | 'skill' | 'stamina';

/** Q1 단일 → 프로그램 유형 */
export function resolveProgramType(q1: string): { id: ProgramTypeId; name: string } {
  switch (q1) {
    case 'concern_confidence':
      return { id: 'foundation', name: '기초 적응 프로그램' };
    case 'concern_focus':
      return { id: 'immersion', name: '몰입·반응 프로그램' };
    case 'concern_skill':
      return { id: 'skill', name: '종목 스킬업 프로그램' };
    case 'concern_stamina':
      return { id: 'stamina', name: '체력 강화 프로그램' };
    default:
      return { id: 'foundation', name: '기초 적응 프로그램' };
  }
}

/** Q1 두 개 조합(알파벳 순 정렬 키) → 통합 프로그램명 */
const Q1_PAIR_PROGRAM: Record<string, { id: ProgramTypeId; name: string }> = {
  'concern_confidence+concern_focus': {
    id: 'immersion',
    name: '기초 적응·몰입·반응 통합 프로그램',
  },
  'concern_confidence+concern_skill': {
    id: 'skill',
    name: '기초 적응·종목 스킬업 프로그램',
  },
  'concern_confidence+concern_stamina': {
    id: 'foundation',
    name: '기초 적응·체력 강화 프로그램',
  },
  'concern_focus+concern_skill': {
    id: 'skill',
    name: '몰입·반응·종목 스킬업 프로그램',
  },
  'concern_focus+concern_stamina': {
    id: 'immersion',
    name: '몰입·반응·체력 강화 프로그램',
  },
  'concern_skill+concern_stamina': {
    id: 'skill',
    name: '종목 스킬업·체력 강화 프로그램',
  },
};

/** 복수 선택 시 단일 유형이 필요할 때: 구체적 고민 우선 */
const Q1_PRIORITY: string[] = [
  'concern_focus',
  'concern_skill',
  'concern_stamina',
  'concern_confidence',
];

/**
 * Q1 다중 선택 → 프로그램 유형명·id
 * - 1개: 단일 매핑
 * - 2개: 쌍 조합 테이블
 * - 3~4개: 복합 맞춤 + 대표 id는 priority로
 */
export function resolveProgramTypeFromQ1(q1: string[]): { id: ProgramTypeId; name: string } {
  const uniq = [...new Set(q1)].filter(Boolean);
  if (uniq.length === 0) {
    return { id: 'foundation', name: '맞춤 프로그램' };
  }
  if (uniq.length === 1) {
    return resolveProgramType(uniq[0]);
  }
  if (uniq.length === 2) {
    const key = [...uniq].sort().join('+');
    const pair = Q1_PAIR_PROGRAM[key];
    if (pair) return pair;
  }
  const primary = Q1_PRIORITY.find((k) => uniq.includes(k)) ?? uniq[0];
  const single = resolveProgramType(primary);
  return {
    id: single.id,
    name: `복합 고민 맞춤 프로그램 (${single.name} 중심)`,
  };
}

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

function labelFor(value: string | null, options: readonly { value: string; label: string }[]): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

const LEVEL_ORDER = ['level_beginner', 'level_basic', 'level_some', 'level_skilled'] as const;

/** Q3 복수일 때 서술용: 가장 높은 단계를 기준으로 */
function highestLevel(q3: string[]): string | null {
  let bestIdx = -1;
  let best: string | null = null;
  for (const l of q3) {
    const idx = LEVEL_ORDER.indexOf(l as (typeof LEVEL_ORDER)[number]);
    if (idx >= 0 && idx > bestIdx) {
      bestIdx = idx;
      best = l;
    }
  }
  return best;
}

/** Q4 다중 → 수업 진행 문구 */
function q4ProgramSnippet(q4: string[]): string {
  if (q4.length === 0) return '맞춤';
  const parts: string[] = [];
  if (q4.includes('format_one')) parts.push('1:1 맞춤');
  if (q4.includes('format_group')) parts.push('소그룹');
  if (q4.includes('format_recommend')) parts.push('상담 후 추천');
  if (parts.length === 0) return '맞춤';
  if (parts.length === 1) return parts[0];
  return `${parts.join('·')} 등 복수 형태`;
}

const CLASS_FORMAT_BULLETS = [
  '기초 → 응용 단계별 구성',
  '아이 수준에 맞춘 난이도 조절',
  '반복 가능한 구조로 실력 향상 유도',
] as const;

const DEFAULT_EXPECTED_BULLETS = [
  '운동에 대한 부담 감소 및 참여도 증가',
  '기초 체력 및 신체 기능 향상',
  '눈에 보이는 실력 변화 및 자신감 형성',
] as const;

function expectedChangeBullets(q5: string[]): readonly string[] {
  const base = [...DEFAULT_EXPECTED_BULLETS];
  if (q5.includes('priority_fun')) {
    base[0] = '즐거운 참여를 바탕으로 운동에 대한 부담 감소 및 참여도 증가';
  }
  if (q5.includes('priority_skill')) {
    base[2] = '눈에 보이는 실력 변화와 성취감·자신감 형성';
  }
  if (q5.includes('priority_system')) {
    base[1] = '단계적 지도를 통한 기초 체력 및 신체 기능 향상';
  }
  if (q5.includes('priority_feedback')) {
    base[2] = '꾸준한 피드백을 통한 실력 변화 및 자신감 형성';
  }
  return base;
}

function paragraphForConcern(c: string, q3: string[]): string {
  const hasBeginner = q3.includes('level_beginner');
  const hi = highestLevel(q3);
  const levelLabel = hi ? labelFor(hi, Q3_OPTIONS) : null;

  switch (c) {
    case 'concern_confidence':
      if (hasBeginner) {
        return `운동에 대한 자신감·적응이 더 필요해 보이며, 활동 경험은 이제 막 시작하는 단계(입문)에 해당할 수 있습니다.`;
      }
      if (levelLabel) {
        return `운동에 대한 자신감이 부족한 편으로 보이며, 현재 수준은 「${levelLabel}」에 해당하는 구간으로 이해할 수 있습니다.`;
      }
      return `운동에 대한 자신감이나 참여 부담이 함께 고려되어야 합니다.`;
    case 'concern_focus':
      return `집중 시간이 짧고 흥미가 쉽게 옮겨가는 경향이 있어, 짧은 단위의 몰입·반응형 활동이 적합합니다.`;
    case 'concern_skill':
      return `특정 종목을 배우고 성취하고 싶은 목표가 분명합니다. 종목별 기술 단계와 안전한 진행을 함께 설계하는 것이 좋습니다.`;
    case 'concern_stamina':
      return `활동량이나 지구력이 부족하게 느껴지는 상태로, 무리 없는 강도 조절과 꾸준한 루틴이 필요합니다.`;
    default:
      return '';
  }
}

/** Q1·Q3 기반 현재 상태 (복수 고민 반영) */
function buildProblemSummary(q1: string[], q3: string[]): string {
  const paras = q1.map((c) => paragraphForConcern(c, q3)).filter(Boolean);
  if (paras.length === 0) {
    return '선택하신 고민을 바탕으로 상태를 정리했습니다.';
  }
  if (paras.length === 1) {
    return paras[0];
  }
  return `선택하신 고민이 복합적으로 겹쳐 있습니다.\n${paras.map((p, i) => `${i + 1}) ${p}`).join('\n')}`;
}

function buildRecommendedDirection(q2: string[]): string {
  const labels = labelsForSelected(q2, Q2_OPTIONS);
  if (labels.length === 0) {
    return `변화 방향(Q2)을 선택해 주시면 목표에 맞춘 추천 방향을 더 구체적으로 안내드릴 수 있습니다.`;
  }
  if (labels.length === 1) {
    return `보호자님께서 기대하시는 변화 방향은 「${labels[0]}」에 가깝습니다. 이 목표에 맞춰 세션 목표와 피드백 리듬을 맞추겠습니다.`;
  }
  return `보호자님께서 기대하시는 변화 방향은 다음이 함께 선택되었습니다: ${labels.map((l) => `「${l}」`).join(', ')}. 복수 목표가 동시에 반영되도록 단계별로 균형을 맞추겠습니다.`;
}

export type DiagnosisResult = {
  resultTitle: string;
  programTypeName: string;
  programTypeId: ProgramTypeId;
  introParagraph: string;
  currentStateText: string;
  recommendedDirectionText: string;
  classFormatIntro: string;
  classFormatBullets: readonly string[];
  expectedChangeBullets: readonly string[];
  summaryForForm: string;
};

function pushQuestionBlock(
  lines: string[],
  title: string,
  values: string[],
  options: readonly { value: string; label: string }[]
) {
  lines.push(title);
  const labels = labelsForSelected(values, options);
  if (labels.length === 0) {
    lines.push('· (선택 없음)');
  } else {
    for (const l of labels) {
      lines.push(`· ${l}`);
    }
  }
  lines.push('');
}

function buildSummaryForForm(
  q1: string[],
  q2: string[],
  q3: string[],
  q4: string[],
  q5: string[],
  result: Omit<DiagnosisResult, 'summaryForForm'>
): string {
  const lines: string[] = [];
  lines.push('[선택한 진단 문항]');
  lines.push('');
  pushQuestionBlock(
    lines,
    'Q1. 우리 아이의 현재 가장 고민되는 부분은 무엇인가요?',
    q1,
    Q1_OPTIONS
  );
  pushQuestionBlock(lines, 'Q2. 어떤 방향으로 변화하길 원하시나요?', q2, Q2_OPTIONS);
  pushQuestionBlock(lines, 'Q3. 현재 아이의 운동 수준은 어느 정도인가요?', q3, Q3_OPTIONS);
  pushQuestionBlock(lines, 'Q4. 어떤 형태의 수업을 고려하고 계신가요?', q4, Q4_OPTIONS);
  pushQuestionBlock(lines, 'Q5. 수업에서 가장 중요하게 생각하는 부분은 무엇인가요?', q5, Q5_OPTIONS);

  lines.push('[맞춤 추천 분석]');
  lines.push('');
  lines.push(`프로그램 유형: ${result.programTypeName}`);
  lines.push('');
  lines.push(result.introParagraph);
  lines.push('');
  lines.push('[분석 결과]');
  lines.push('');
  lines.push('현재 상태');
  lines.push(result.currentStateText);
  lines.push('');
  lines.push('추천 방향');
  lines.push(result.recommendedDirectionText);
  lines.push('');
  lines.push('추천 수업 방식');
  lines.push(result.classFormatIntro);
  for (const b of result.classFormatBullets) {
    lines.push(`· ${b}`);
  }
  lines.push('');
  lines.push('기대 변화');
  for (const b of result.expectedChangeBullets) {
    lines.push(`· ${b}`);
  }
  return lines.join('\n');
}

/**
 * Q1 최소 1개 필수. Q2~Q5는 다중 선택·미선택 가능.
 */
export function getDiagnosisResult(
  q1: string[],
  q2: string[],
  q3: string[],
  q4: string[],
  q5: string[]
): DiagnosisResult | null {
  if (q1.length === 0) return null;

  const { name: programTypeName, id: programTypeId } = resolveProgramTypeFromQ1(q1);

  const multiNote =
    q1.length > 1
      ? ' 여러 고민이 함께 선택되어, 아래 분석에 복합적으로 반영했습니다.'
      : '';

  const introParagraph = `현재 선택하신 내용을 바탕으로 분석했을 때, 아이에게는 「${programTypeName}」이 가장 적합한 상태로 보입니다.${multiNote}`;

  const currentStateText = buildProblemSummary(q1, q3);
  const recommendedDirectionText = buildRecommendedDirection(q2);

  const snippet = q4ProgramSnippet(q4);
  const classFormatIntro = `스포키듀는 아이의 수준과 목표에 맞춰 ${snippet} 형태로 수업을 진행합니다.`;

  const expectedBullets = expectedChangeBullets(q5);

  const partial: Omit<DiagnosisResult, 'summaryForForm'> = {
    resultTitle: '우리 아이 맞춤 추천 프로그램',
    programTypeName,
    programTypeId,
    introParagraph,
    currentStateText,
    recommendedDirectionText,
    classFormatIntro,
    classFormatBullets: CLASS_FORMAT_BULLETS,
    expectedChangeBullets: expectedBullets,
  };

  return {
    ...partial,
    summaryForForm: buildSummaryForForm(q1, q2, q3, q4, q5, partial),
  };
}
