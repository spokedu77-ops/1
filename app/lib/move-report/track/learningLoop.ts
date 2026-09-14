export const PRIMARY_SKILLS = [
  '공간·이동',
  '균형·중심',
  '달리기',
  '점프·착지',
  '측면·리듬 이동',
  '편측 움직임',
  '스텝·협응',
  '장애물 이동',
  '반응·방향전환',
  '순서·기억 이동',
  '굴리기·던지기',
  '캐치',
  '킥·패스',
  '드리블',
  '타격·라켓',
  '협동·사회적 움직임',
] as const;

export type TaskState = 'unstable' | 'forming' | 'stable';
export type ProcessState = TaskState | 'not_observed';
export type SelectionDecision =
  | 'access_reset'
  | 'stabilize'
  | 'fade_support'
  | 'generalize'
  | 'advance'
  | 'transfer';
export type DisplayDirection = 'adjust' | 'generalize' | 'advance' | 'transfer';

export const TASK_STATES: Array<{ value: TaskState; label: string }> = [
  { value: 'unstable', label: '어려움' },
  { value: 'forming', label: '형성중' },
  { value: 'stable', label: '안정' },
];

export const PROCESS_STATES: Array<{ value: ProcessState; label: string }> = [
  { value: 'unstable', label: '어려움' },
  { value: 'forming', label: '형성중' },
  { value: 'stable', label: '안정' },
  { value: 'not_observed', label: '미관찰' },
];

export const DISPLAY_DIRECTIONS: Array<{ value: DisplayDirection; label: string; desc: string }> = [
  { value: 'adjust', label: '유지·조정', desc: '현재 수준에서 조건이나 지원을 조정' },
  { value: 'generalize', label: '일반화', desc: '같은 수준을 다른 활동·조건에서 확인' },
  { value: 'advance', label: '상향', desc: '다음 Level로 한 단계 확장' },
  { value: 'transfer', label: '적용', desc: '짝·게임·스포츠 상황에 적용' },
];

const PAIR_SKILLS = [
  '공간·이동',
  '균형·중심',
  '달리기',
  '점프·착지',
  '측면·리듬 이동',
  '편측 움직임',
  '스텝·협응',
  '장애물 이동',
  '반응·방향전환',
  '순서·기억 이동',
  '협동·사회적 움직임',
] as const;

export function defaultPrimarySkillForSession(sessionNumber: number): string | null {
  if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || sessionNumber > 22) return null;
  return PAIR_SKILLS[Math.floor((sessionNumber - 1) / 2)] ?? null;
}

export function recommendSelection(input: {
  attendance_status?: 'present' | 'absent';
  observation_opportunity_band?: 'one' | 'two' | 'three_plus' | null;
  primary_skill?: string | null;
  skill_level?: number | null;
  task_state?: TaskState | null;
  process_state?: ProcessState | null;
  support_level?: number | null;
}): SelectionDecision | null {
  if (input.attendance_status !== 'present') return null;
  if (input.observation_opportunity_band == null) return null;
  if (!input.primary_skill || input.skill_level == null || input.task_state == null) return null;

  if (input.task_state !== 'stable') return 'stabilize';
  if (input.process_state === 'unstable' || input.process_state === 'forming') return 'stabilize';
  if ((input.support_level ?? 0) >= 2) return 'fade_support';

  // A single session cannot establish generalization strongly enough to auto-advance.
  // The conservative default is to verify the same skill at the same level in another condition.
  return 'generalize';
}

export function toDisplayDirection(decision: SelectionDecision | null | undefined): DisplayDirection | null {
  if (!decision) return null;
  if (decision === 'generalize') return 'generalize';
  if (decision === 'advance') return 'advance';
  if (decision === 'transfer') return 'transfer';
  return 'adjust';
}

export function decisionForDisplayDirection(
  direction: DisplayDirection,
  recommendation?: SelectionDecision | null,
): SelectionDecision {
  if (direction === 'generalize') return 'generalize';
  if (direction === 'advance') return 'advance';
  if (direction === 'transfer') return 'transfer';
  if (recommendation && ['access_reset', 'stabilize', 'fade_support'].includes(recommendation)) {
    return recommendation;
  }
  return 'stabilize';
}
