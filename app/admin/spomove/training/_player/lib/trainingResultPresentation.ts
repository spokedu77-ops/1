import { buildTrainingResultViewModel, type ResultFact, type TrainingResultViewInput } from './trainingResultViewModel';
import { resolveTrainingSelection } from './trainingActivity';

const TITLES = {
  natural_complete: '오늘의 활동을 마쳤어요!',
  stopped_early: '오늘은 여기까지!',
  cancelled: '활동 실행을 취소했어요.',
  failed: '활동 실행이 중단되었어요.',
} as const;

/** Render existing evidence only. Settings, elapsed time and responses remain distinct. */
export function buildTrainingResultPresentation(input: TrainingResultViewInput) {
  const vm = buildTrainingResultViewModel(input);
  const id = resolveTrainingSelection(input.cfg.mode, input.cfg.level, { activityId: input.cfg.activityId }).activityId;
  const recorded = vm.facts.filter(item => item.id !== 'elapsed');
  const hasDistribution = vm.distribution.length > 0;
  const isBridge = id === 'glass-bridge-memory';
  const isMemory = input.cfg.mode === 'spatial' || input.cfg.mode === 'simon';
  const isDive = Boolean(input.diveActionMove);
  const observed = (key: string) => recorded.find(item => item.id === key);
  const progress = observed(isBridge ? input.glassBridge?.scoringMode === 'color-choice' ? 'completed' : 'presented' : id === 'visual-search' ? 'tasks' : 'presented');
  const targets = observed('targets');
  // A fraction is valid only when the recorded and configured quantities share a unit.
  const configuredCount = /^(\d+)(회|라운드)$/.exec(vm.volume);
  const recordedCount = progress ? /^(\d+)(회|라운드)$/.exec(progress.value) : null;
  const progressValue = progress && configuredCount && recordedCount && configuredCount[2] === recordedCount[2]
    ? `${recordedCount[1]}/${configuredCount[1]}${recordedCount[2]}` : progress?.value;
  const summary: ResultFact[] = [];
  if (Number.isFinite(input.elapsedMs) && input.elapsedMs >= 0) summary.push({ id: 'elapsed', label: '활동 시간', value: vm.elapsed });
  if (progress) summary.push({ ...progress, value: progressValue ?? progress.value,
    label: isBridge && progress.id === 'completed' ? '정답 공개 라운드'
      : isBridge || id === 'instant-memory' ? '제시 라운드' : '제시 과제' });
  if (targets) summary.push({ ...targets, label: '목표 출현' });
  else if (vm.volume) summary.push({ id: 'volume', label: '설정 분량', value: vm.volume });
  // Keep only additional observed facts. Never create cards to fill the page.
  const summaryIds = new Set(summary.map(item => item.id));
  const recordFacts = recorded.filter(item => !summaryIds.has(item.id));
  const recordTitle = hasDistribution ? vm.distributionKind === 'zone' ? '목표가 나타난 구역' : vm.distributionTitle
    : isBridge ? '기억의 유리 다리 활동 기록' : isDive ? '이번 액션무브 활동' : isMemory ? '이번 기억 활동' : '이번 활동의 진행 기록';
  const recordSubtitle = hasDistribution ? vm.distributionKind === 'zone' ? 'SPOMAT 4구역 발판 배치 기준'
    : vm.distributionKind === 'number' ? '숫자별 실제 제시 기록' : '화면에 제시된 색상 기록'
    : isBridge ? '교사 입력을 바탕으로 정리한 기록' : '이번 활동에서 기록된 진행 정보';
  const recordBadge = hasDistribution ? vm.distributionKind === 'zone' ? '2×2 매트' : vm.distributionKind === 'number' ? '숫자 기록' : '색상 기록'
    : isBridge ? '교사 입력' : isDive ? '액션 구성' : isMemory ? '기억 활동' : '활동 기록';
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
    recordFacts, note, hasDistribution, activityDescription, educationTags,
  };
}