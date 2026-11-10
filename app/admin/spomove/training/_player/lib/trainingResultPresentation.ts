import { buildTrainingResultViewModel, type ResultFact, type TrainingResultViewInput } from './trainingResultViewModel';
import { resolveTrainingSelection } from './trainingActivity';
import { resolveDiveActionMoveIds } from './diveActionMoveReport';
import { isDiveActionMoveUnityTheme } from '@/app/lib/spomove/diveThemes';
import { buildStages } from '../flow-lab/engine/modules/stageBuilder';
import { FLOW_MODULES, type FlowModuleKey } from '../flow-lab/engine/modules/flowModules';

type VisualBase = { title: string; flow: string[] };
export type ResultActivityVisual = VisualBase & (
  | { kind: 'direction' }
  | { kind: 'sequence' }
  | { kind: 'bridge' }
  | { kind: 'layout-memory' }
  | { kind: 'number-memory' }
  | { kind: 'flanker'; arrow: boolean; nested: boolean }
  | { kind: 'dive'; motions: string[] }
  | { kind: 'structure'; symbols: string[]; targetIndex: number; response: string; responseKind: 'move' | 'speak' | 'observe' }
);

function activityVisual(input: TrainingResultViewInput): ResultActivityVisual {
  const selection = resolveTrainingSelection(input.cfg.mode, input.cfg.level, { activityId: input.cfg.activityId });
  const id = selection.activityId;
  if (id === 'direction-cue' || id === 'simon-arrow') return {
    kind: 'direction', title: '화살표와 발판의 연결', flow: ['화살표 확인', '방향 선택', '발판 이동'],
  };
  if (selection.runtime === 'sequence-memory') return {
    kind: 'sequence', title: '보고 기억하고 순서대로', flow: ['색 순서 확인', '순서 기억', '같은 순서로 이동'],
  };
  if (id === 'glass-bridge-memory') return {
    kind: 'bridge', title: '점점 길어지는 발판', flow: ['발판 순서 확인', '차례대로 기억', '같은 순서로 이동'],
  };
  if (id === 'instant-memory') return {
    kind: 'layout-memory', title: '배치를 기억하고 변화 찾기', flow: ['전체 색 배치 확인', '배치 기억', '바뀐 한 칸 찾기'],
  };
  if (selection.runtime === 'color-number-memory' || selection.runtime === 'color-number-quiz') return {
    kind: 'number-memory', title: '번호와 색을 함께 기억', flow: ['번호·색 확인', '연결 기억', '질문 확인'],
  };
  if (['flanker-arrow', 'flanker-theme', 'flanker-extreme', 'flanker-nested'].includes(id)) return {
    kind: 'flanker', title: '방해 자극 속 목표 구별',
    arrow: id === 'flanker-arrow' || (id === 'flanker-extreme' && input.cfg.flankerExtremeMode === 'arrow'),
    nested: id === 'flanker-nested',
    flow: ['가운데 목표 확인', '주변 방해 구별', '목표에 맞춰 반응'],
  };
  if (id === 'action-move') {
    const labels = { SIDE: '방향 전환', JUMP: '점프', DUCK: '숙이기', BONUS: '복합 움직임' };
    const session = input.diveActionMove;
    const actions = !session ? [] : isDiveActionMoveUnityTheme(session.environmentTheme)
      ? resolveDiveActionMoveIds(session).map(action => labels[action])
      : buildStages((session.flowFeatures ?? []).filter((key): key is FlowModuleKey => Object.hasOwn(FLOW_MODULES, key)), session.stageDurationSec ?? undefined,
        { layout: session.flowLayout, includeBonus: session.flowIncludeBonus })
        .flatMap(stage => stage.label === 'RANDOM' ? [...stage.activeModules].map(key => FLOW_MODULES[key].label) : stage.isBonus ? ['복합 움직임'] : [FLOW_MODULES[stage.newModule].label]);
    return { kind: 'dive', title: '신호에 따른 움직임 전환',
      motions: actions.length ? actions : ['신호 확인', '움직임 전환'],
      flow: ['화면 신호 확인', '안내 동작 수행', '다음 동작으로 전환'] };
  }
  const structure = (title: string, symbols: string[], response: string, flow: string[], responseKind: 'move' | 'speak' | 'observe' = 'move', targetIndex = 0): ResultActivityVisual =>
    ({ kind: 'structure', title, symbols, targetIndex, response, responseKind, flow });
  if (id === 'relative-compass') return structure('지금 선 발판에서 한 칸 이동', ['□', '↑', '□'], '현재 위치에서 한 칸', ['현재 발판 확인', '화살표 방향으로 한 칸', '도착 위치에서 다음 신호'], 'move', 1);
  if (id === 'shape-completion') return structure('빈자리에 맞는 조각 찾기', ['◯', '◔', '◕'], '맞는 조각 위치 선택', ['빈 모양 확인', '맞는 조각 선택', '해당 발판 이동'], 'move', 2);
  if (id.startsWith('stroop-') && id !== 'stroop-arrow') return structure('글자와 색을 규칙에 따라 구별', ['빨강', '파랑'], '말로 답하기', ['현재 규칙 확인', '의미·색 구별', '규칙에 맞춰 말하기'], 'speak');
  if (id === 'stroop-arrow') return structure('화살표 방향과 색 구별', ['↑', '↓', '→'], '방향에 맞춰 이동', ['화살표 확인', '방향 구별', '해당 발판 이동']);
  if (id.startsWith('go-no-go-')) return structure('움직임과 멈춤 구별', ['GO', 'STOP'], '신호에 맞춰 움직임·멈춤', ['신호 확인', '실행·억제 구별', '움직이거나 멈추기']);
  if (id.startsWith('task-switch-')) return structure('신호에 따라 반응 규칙 전환', ['A', '⇄', 'B'], '현재 규칙에 맞춰 반응', ['규칙 확인', '전환 신호 구별', '바뀐 규칙으로 반응'], 'move', 1);
  if (id === 'visual-search') return structure('여러 기호에서 목표 찾기', ['+', '×', '+'], '목표 구역 선택', ['목표 특징 확인', '같은 목표 탐색', '해당 구역 이동'], 'move', 1);
  if (['target-tracking', 'color-tracker', 'goalkeeper', 'moving-number-reader'].includes(id)) return structure('움직이는 목표 끝까지 추적', [id === 'moving-number-reader' ? '2' : '●', '→', '◎'], '목표의 위치 확인', ['목표 확인', '움직임 추적', '도착 위치·번호 구별']);
  if (id === 'motion-gate') return structure('다가오는 게이트에 맞춰 이동', ['▯', '▯', '▯'], '게이트 색 발판 이동', ['게이트 색 확인', '해당 발판 이동', '다음 게이트 준비']);
  if (id === 'hand-foot') return structure('손·발 신호와 위치 연결', ['손', '발'], '안내된 손·발로 반응', ['신체 부위 확인', '목표 위치 선택', '손·발로 반응']);
  const moving = ['rush', 'falling-bricks', 'balloon', 'beat-wave', 'mole', 'wormhole', 'virus', 'simon-balloon'].includes(selection.runtime);
  return structure(moving ? '다가오는 색 자극과 발판 연결' : '시각 자극과 발판 연결',
    id === 'falling-bricks' ? ['▰', '▰'] : ['●', '◆', '●'],
    id === 'falling-bricks' ? '두 색 위치에 한 발씩' : '신호에 맞는 발판 이동',
    ['자극 확인', moving ? '색·움직임 구별' : '색·위치 구별', '해당 발판 반응']);
}

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
  const visual = hasDistribution ? null : activityVisual(input);
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
  const recordTitle = visual ? visual.title : hasDistribution ? vm.distributionKind === 'zone' ? '목표가 나타난 구역' : vm.distributionTitle
    : isBridge ? '기억의 유리 다리 활동 기록' : isDive ? '이번 액션무브 활동' : isMemory ? '이번 기억 활동' : '이번 활동의 진행 기록';
  const recordSubtitle = visual ? '활동 구조 살펴보기' : hasDistribution ? vm.distributionKind === 'zone' ? 'SPOMAT 4구역 발판 배치 기준'
    : vm.distributionKind === 'number' ? '숫자별 실제 제시 기록' : '화면에 제시된 색상 기록'
    : isBridge ? '교사 입력을 바탕으로 정리한 기록' : '이번 활동에서 기록된 진행 정보';
  const recordBadge = visual ? '교육용 예시' : hasDistribution ? vm.distributionKind === 'zone' ? '2×2 매트' : vm.distributionKind === 'number' ? '숫자 기록' : '색상 기록'
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
    recordFacts, note, hasDistribution, visual, activityDescription, educationTags,
  };
}
