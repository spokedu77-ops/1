import { buildTrainingResultViewModel, type ResultFact, type TrainingResultViewInput } from './trainingResultViewModel';
import { resolveTrainingSelection } from './trainingActivity';
import { selectResultEducation } from './trainingResultEducation';

const TITLES = {
  natural_complete: '오늘의 활동을 마쳤어요!',
  stopped_early: '오늘은 여기까지!',
  cancelled: '활동 실행을 취소했어요.',
  failed: '활동 실행이 중단되었어요.',
} as const;

/** Keep observed quantities separate from authored volume and educational demands. */
export function buildTrainingResultPresentation(input: TrainingResultViewInput, educationSeed = 0) {
  const vm = buildTrainingResultViewModel(input);
  const selection = resolveTrainingSelection(input.cfg.mode, input.cfg.level, { activityId: input.cfg.activityId });
  const id = selection.activityId;
  const recorded = vm.facts.filter(item => item.id !== 'elapsed');
  const hasDistribution = vm.distribution.length > 0;
  const feedback = hasDistribution ? null : selectResultEducation(input, educationSeed);
  const isBridge = id === 'glass-bridge-memory';
  const observed = (key: string) => recorded.find(item => item.id === key);
  const progress = isBridge ? observed('success') ?? observed('completed') ?? observed('presented')
    : observed(id === 'visual-search' ? 'tasks' : 'presented');
  const targets = observed('targets');
  // These runtimes report whole tasks/rounds, not individual items inside a pattern.
  const roundCounter = isBridge || ['instant-memory', 'number-cart', 'color-tracker', 'shape-completion'].includes(id);
  const configuredCount = /^(\d+)(회|라운드|과제)$/.exec(vm.volume);
  const recordedCount = progress ? /^(\d+)(회|라운드|과제)$/.exec(progress.value) : null;
  const unit = id === 'visual-search' ? '과제' : roundCounter ? '라운드' : recordedCount?.[2];
  let configuredUnit = configuredCount?.[2];
  if (id === 'visual-search' && configuredUnit === '회') configuredUnit = '과제';
  if (roundCounter && configuredUnit === '회' && input.cfg.timeMode === 'reps') configuredUnit = '라운드';
  // Admin calls one signal/reaction a "round". Its counter still counts one cue,
  // unlike memory patterns containing multiple cues. Normalize only that known case.
  if (input.cfg.adminRounds && configuredUnit === '라운드' && !roundCounter && selection.runtime !== 'sequence-memory'
    && !['color-number-memory', 'color-number-quiz'].includes(selection.runtime)) configuredUnit = unit;
  const combined = Boolean(recordedCount && configuredCount && unit === configuredUnit);
  const progressValue = recordedCount && unit
    ? `${recordedCount[1]}${combined ? `/${configuredCount![1]}` : ''}${unit}` : progress?.value;
  const summary: ResultFact[] = [];
  if (Number.isFinite(input.elapsedMs) && input.elapsedMs >= 0) summary.push({ id: 'elapsed', label: '활동 시간', value: vm.elapsed });
  if (progress) summary.push({ ...progress, value: progressValue ?? progress.value,
    label: isBridge ? progress.id === 'success' ? '성공' : progress.id === 'completed' ? '정답 공개' : '패턴 제시' : '진행' });
  if (targets) summary.push({ ...targets, label: '목표 출현' });
  if (!combined && vm.volume) summary.push({ id: 'volume', label: '설정 분량', value: vm.volume });
  // Keep only additional observed facts. Never create cards to fill the page.
  const summaryIds = new Set(summary.map(item => item.id));
  const recordFacts = recorded.filter(item => !summaryIds.has(item.id));
  const recordTitle = feedback ? '활동 이해와 지도 포인트' : vm.distributionKind === 'zone' ? '목표가 나타난 구역' : vm.distributionTitle;
  const recordSubtitle = feedback ? '프로그램의 교육적 경험' : vm.distributionKind === 'zone' ? 'SPOMAT 4구역 발판 배치 기준'
    : vm.distributionKind === 'number' ? '숫자별 실제 제시 기록' : '화면에 제시된 색상 기록';
  const recordBadge = feedback ? '교육 안내' : vm.distributionKind === 'zone' ? '2×2 매트' : vm.distributionKind === 'number' ? '숫자 기록' : '색상 기록';
  const note = hasDistribution ? vm.distributionKind === 'zone' ? '목표가 화면에 나타난 구역별 횟수입니다.'
    : vm.distributionKind === 'number' ? '숫자가 화면에 제시된 횟수입니다.' : '색상 자극이 화면에 제시된 횟수입니다.'
    : isBridge && input.glassBridge ? '교사가 입력한 활동 기록입니다.' : null;
  const completeCopies = ['오늘 진행한 활동을 함께 살펴볼까요?', '이번 활동에서는 어떤 신호들이 나왔을까요?', '오늘의 활동 기록을 확인해 보세요.', '이번 활동에서 경험한 움직임을 떠올려 보세요.'];
  const earlyCopies = ['오늘 진행한 활동을 확인해 볼까요?', '여기까지 진행한 내용을 살펴보세요.', '이번 활동에서 어떤 자극이 나왔는지 확인해 보세요.', '다음에 같은 활동을 다시 진행할 수 있어요.'];
  // Keep varied guidance for completed / stopped runs; cancellation and error stay fixed.
  const seed = `${vm.activityTitle}:${Math.round(input.elapsedMs / 1000)}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const copies = vm.reason === 'natural_complete' ? completeCopies : earlyCopies;
  const description = vm.reason === 'cancelled' ? '실행을 취소했어요. 남아 있는 기록을 확인해 주세요.'
    : vm.reason === 'failed' ? '중단되기 전까지 남은 기록을 확인해 주세요.' : copies[hash % copies.length];
  const activityDescription = input.education?.description.trim() || vm.activityDescription;
  const educationTags = [...new Set(input.education?.tags ?? vm.educationTags)].filter(Boolean).slice(0, 3);
  return { ...vm, title: TITLES[vm.reason], description, summary, recordTitle, recordSubtitle, recordBadge,
    recordFacts, note, hasDistribution, feedback, activityDescription, educationTags,
  };
}
