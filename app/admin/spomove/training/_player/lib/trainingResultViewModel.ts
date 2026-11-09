import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { resolveSpomoveCompletionPresentation } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { buildDiveActionMoveReport, type DiveActionMoveSession } from './diveActionMoveReport';
import type { GlassBridgeResult } from './glassBridgeMemory';
import { resolveTrainingSelection, type TrainingActivityId } from './trainingActivity';
import { trainingActivityGuide } from './trainingActivityGuide';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';
import { colorMeta, describeSessionVolume, formatElapsedSeconds, RESULT_COLOR_ORDER, type ColorStimulusCounts, type TrainingResultConfig } from './trainingResultSummary';

export type ResultFact = { id: string; label: string; value: string };
export type ResultSessionSettings = { title?: string; primary: string; secondary?: string };
export type TrainingResultViewInput = {
  cfg: TrainingResultConfig;
  completionReason?: SpomoveCompletionReason;
  elapsedMs: number;
  colorCounts: ColorStimulusCounts | null;
  stims?: number;
  glassBridge?: GlassBridgeResult;
  programTitle?: string;
  education?: { description: string; tags: string[] };
  volumeLabel?: string;
  sessionSettings?: ResultSessionSettings | null;
  diveActionMove?: DiveActionMoveSession | null;
};

const CHILD_TITLES: Record<SpomoveCompletionReason, string> = {
  natural_complete: '오늘의 미션을 마쳤어요!',
  stopped_early: '오늘은 여기까지!',
  cancelled: '이번 미션은 취소되었어요.',
  failed: '미션 실행에 문제가 생겼어요.',
};

function count(value: number | undefined): value is number {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0;
}

function validCounts(value: ColorStimulusCounts | null): value is ColorStimulusCounts {
  return value !== null && RESULT_COLOR_ORDER.every(id => count(value[id]));
}

// Canonical activity identities, not runtime names (balloon-pop runs as `balloon`).
const COLOR_DISTRIBUTION_ACTIVITIES = new Set<TrainingActivityId>([
  'wave-dodge', 'falling-bricks', 'balloon-pop', 'beat-wave', 'visual-camouflage',
  'mole', 'virus-outbreak', 'wormhole', 'motion-gate',
]);

/** Presentation only: never infer child performance or alter runtime / persistence. */
export function buildTrainingResultViewModel(input: TrainingResultViewInput) {
  const { cfg, elapsedMs, stims, glassBridge: bridge } = input;
  const reason = input.completionReason ?? 'natural_complete';
  const completion = resolveSpomoveCompletionPresentation(reason);
  const selection = resolveTrainingSelection(cfg.mode, cfg.level, { activityId: cfg.activityId });
  const id = selection.activityId;
  const directionOnly = id === 'flanker-arrow' || (id === 'flanker-extreme' && cfg.flankerExtremeMode === 'arrow');
  const search = id === 'visual-search';
  const numberReader = id === 'moving-number-reader';
  const dive = input.diveActionMove ? buildDiveActionMoveReport(input.diveActionMove, elapsedMs, reason) : null;
  // Only activities whose counters represent visible color cues may use color bars.
  // Number-reader and search reuse these counters with explicitly different meanings.
  const zoneActivity = ['color-tracker', 'number-cart', 'goalkeeper'].includes(id);
  const colorActivity = !directionOnly && !['direction-cue', 'relative-compass', 'shape-completion'].includes(id)
    && !dive && cfg.mode !== 'spatial' && cfg.mode !== 'simon'
    && (['basic', 'flanker', 'stroop'].includes(cfg.mode) || COLOR_DISTRIBUTION_ACTIVITIES.has(id));
  const distributionSupported = search || numberReader || colorActivity || zoneActivity;
  const rawCounts = distributionSupported && validCounts(input.colorCounts) ? input.colorCounts : null;
  // These legacy engines count red/yellow/green/blue by index, unlike lane counters.
  // Restore their authored positions in presentation without rewriting saved results.
  const counts = rawCounts && (id === 'number-cart' || id === 'color-tracker')
    ? { red: rawCounts.red, yellow: rawCounts.blue, green: rawCounts.green, blue: rawCounts.yellow }
    : rawCounts;
  const total = counts ? RESULT_COLOR_ORDER.reduce((sum, key) => sum + counts[key], 0) : undefined;
  const rich = resolveTrainingResultRichContent(cfg, elapsedMs, counts, {
    programTitle: input.programTitle, volumeLabel: input.volumeLabel, completionReason: reason, stims, glassBridge: bridge,
  });
  const guide = trainingActivityGuide(cfg.mode, cfg.level, { activityId: id });
  const facts: ResultFact[] = [];
  const settings: ResultFact[] = [];
  const limitations = ['아동의 정확도·반응 시간·실제 움직임은 자동 측정하지 않습니다. 교육 목표는 측정된 수행 성과가 아닙니다.'];
  const add = (key: string, label: string, value: number | undefined, unit: string) => {
    if (count(value)) facts.push({ id: key, label, value: `${value}${unit}` });
    else limitations.push(`${label}: 현재 호출부에서 데이터 미전달.`);
  };
  const setting = (key: string, label: string, value: string) => settings.push({ id: key, label, value });
  let volume = input.volumeLabel ?? describeSessionVolume(cfg);
  let progress: string;
  let nextChallenge = rich.coachTip;
  let objective = guide?.goal ?? rich.programSummary;
  let meaning = `활동 설계상 ${rich.benefitTags.length ? rich.benefitTags.join(' · ') : '화면 신호의 구별과 규칙에 따른 반응'} 요소를 요구합니다.`;
  let recordNote = '실제 기록 없음';

  if (search) {
    const stage = cfg.visualSearchStage;
    const targets = cfg.visualSearchTargetCount;
    if (stage) setting('stage', '탐색 단계', `${stage}단계 · ${stage === 1 ? '고정형 · 10~30개' : '이동형 · 20~60개'}`);
    else limitations.push('탐색 단계: 현재 호출부에서 데이터 미전달.');
    if (targets) setting('targets', '과제당 목표', `${targets}개`);
    else limitations.push('과제당 목표 수: 현재 호출부에서 데이터 미전달.');
    add('tasks', '제시된 탐색 과제', stims, '회');
    add('targets', '제시된 목표 기호', total, '개');
    objective = '여러 기호에서 다른 색·모양 조합을 찾아 해당 SPOMAT 구역으로 이동하도록 설계된 활동입니다.';
    meaning = '흰색·회색 +/×의 구별, 시각 탐색, 방해 자극 중 목표 선택을 요구합니다. 구역 색은 목표 기호의 색이 아니라 SPOMAT 위치입니다.';
    nextChallenge = '다음에는 목표의 색과 모양을 함께 확인하면서 찾아보세요.';
    limitations.push('정답 자동 공개는 진행 절차이며 아동의 정답·성공 판정이 아닙니다.');
    recordNote = counts ? (total === 0 ? '실제 기록 없음 · 목표 구역 출현 0회' : '목표 구역별 출현 횟수입니다. 수행 성공 횟수가 아닙니다.') : '현재 호출부에서 목표 구역 데이터 미전달';
    progress = count(stims) ? `${stims}과제 제시` : '과제 기록 미전달';
  } else if (id === 'glass-bridge-memory') {
    objective = '색 발판이 나타난 순서를 기억한 뒤 SPOMAT에서 같은 순서로 움직이도록 설계된 활동입니다.';
    meaning = '시각적 순서 기억, 작업기억과 순차적인 움직임 조절을 요구합니다. 교사 입력은 센서로 측정한 수행 결과와 구분합니다.';
    nextChallenge = '다음에는 색이 나타난 순서를 기억하고 차례대로 움직여 보세요.';
    add('presented', '패턴 제시 완료', bridge?.presentedRounds, '라운드');
    if (bridge?.scoringMode === 'color-choice') {
      add('completed', '정답 공개 완료', bridge.completedRounds, '라운드');
      add('correct', '맞힌 발판', bridge.correctSteps, '개');
      add('incorrect', '틀린 발판', bridge.incorrectSteps, '개');
      add('success', '모두 맞힌 라운드', bridge.successRounds, '라운드');
      add('failure', '오답이 있던 라운드', bridge.failureRounds, '라운드');
      setting('plan', '길이 구성', `3→4→5→6→7칸 · 길이별 ${cfg.targetReps / 5}라운드`);
      limitations.push('맞힌/틀린 발판은 교사가 입력한 색과 정답을 비교한 기록입니다. 오답 후에도 계속 진행합니다.');
      if (bridge.difficulty === 'easy') setting('cue', '설정 제시 방식', '쉬움 · 전체 패턴 20초');
      else if (bridge.difficulty === 'hard' && cfg.speed != null) setting('cue', '설정 제시 방식', `어려움 · 발판당 ${cfg.speed}초`);
      progress = count(bridge.completedRounds) ? `${bridge.completedRounds}라운드 공개 완료` : '공개 완료 기록 미전달';
    } else {
      add('success', '교사 성공 판정', bridge?.successRounds, '라운드');
      add('failure', '교사 실패 판정', bridge?.failureRounds, '회');
      if (bridge) setting('start', '기록된 시작 길이', `${bridge.startLength}칸`);
      if (cfg.speed != null) setting('cue', '설정 제시 방식', `발판당 ${cfg.speed}초`);
      limitations.push('교사 수동 판정 방식의 기록입니다. 실패 판정과 최종 종료 상태는 별개입니다.');
      progress = count(bridge?.presentedRounds) ? `${bridge.presentedRounds}라운드 제시` : '라운드 기록 미전달';
    }
    add('last', '마지막 도달 길이', bridge?.lastLength, '칸');
    recordNote = bridge ? bridge.scoringMode === 'color-choice'
      ? '교사가 입력한 색과 정답을 비교한 기록입니다. 실제 움직임을 자동 측정하지 않습니다.'
      : '교사가 수동으로 판정한 기록입니다. 실제 움직임을 자동 측정하지 않습니다.'
      : '현재 호출부에서 유리 다리 데이터 미전달';
  } else if (dive) {
    facts.push({ id: 'elapsed', label: '실제 진행 시간', value: dive.activityTimeValue });
    settings.push(...dive.snapshot.filter(item => ['actions', 'stage'].includes(item.id)));
    objective = '화면의 시각 신호에 맞춰 전신 움직임을 전환하도록 설계된 활동입니다.';
    meaning = `${dive.movementBody}. 신호에 따른 움직임 전환과 리듬 유지를 요구합니다.`;
    limitations.push('스테이지와 액션 구성은 설정 정보입니다. 실제 동작 횟수·완료 스테이지 수는 자동 측정하지 않습니다.');
    recordNote = '진행 시간과 설정된 스테이지·액션 구성을 구분해 확인하세요.';
    progress = formatElapsedSeconds(elapsedMs);
  } else if (cfg.mode === 'spatial' || cfg.mode === 'simon' || directionOnly) {
    // These engines may use internal color IDs; those are not stimulus distributions.
    facts.push({ id: 'elapsed', label: '실제 진행 시간', value: formatElapsedSeconds(elapsedMs) });
    progress = '횟수 자동 측정 없음';
    recordNote = '자동 측정하지 않음 · 아동의 수행 횟수와 정답률';
    if (cfg.mode !== 'spatial' || id === 'instant-memory') {
      add('presented', id === 'instant-memory' ? '완료된 제시 라운드' : '자극 제시', stims, id === 'instant-memory' ? '라운드' : '회');
      progress = count(stims) ? `${stims}${id === 'instant-memory' ? '라운드' : '회'} 제시` : '제시 기록 미전달';
    }
    if (id === 'sequence-memory') {
      meaning = '활동 설계상 색상 순서의 부호화, 작업기억과 순차적인 움직임 조절을 요구합니다. 설정 기억 길이는 실제로 기억한 개수가 아닙니다.';
      setting('pattern', '설정 기억 길이', cfg.level === 1 ? '3색' : cfg.level === 2 ? '5색' : cfg.level === 3 ? '3→7색' : '10색');
      setting('timing', '색상당 제시 시간', cfg.adminSequenceTiming ? '1~2.5초 랜덤' : cfg.level <= 3 ? '1~3초 랜덤' : cfg.speed != null ? `${cfg.speed}초` : '설정 미전달');
      nextChallenge = '먼저 나온 색부터 순서를 떠올리며 움직여 보세요.';
    }
    if (directionOnly) nextChallenge = '주변 자극에 흔들리지 않고 가운데 목표를 확인해 보세요.';
  } else {
    // stims is the task counter; a multi-target color sum must never replace it.
    add('presented', numberReader ? '제시된 숫자 캡슐' : '자극 제시', stims, '회');
    progress = count(stims) ? `${stims}회 제시` : '제시 기록 미전달';
    if (numberReader) {
      objective = '움직이는 숫자를 추적하고 숫자에 해당하는 SPOMAT 구역으로 이동하도록 설계된 활동입니다.';
      meaning = '숫자 식별, 시각 추적과 숫자·위치 연결을 요구합니다. 캡슐 색은 이동 기준이 아닙니다.';
    }
    recordNote = counts ? (total === 0 ? '실제 기록 없음 · 자극 출현 0회' : '자극 출현 횟수입니다. 정답 횟수나 정확도가 아닙니다.') : distributionSupported ? '현재 호출부에서 자극 분포 데이터 미전달' : '자동 측정하지 않음 · 활동별 자극 분포';
  }
  if (cfg.adminRounds && cfg.timeMode === 'reps') volume = `${cfg.targetReps}라운드`;
  if (id === 'glass-bridge-memory') volume = `${cfg.targetReps}라운드`;
  if (cfg.speed != null && id !== 'glass-bridge-memory' && id !== 'sequence-memory' && !dive) {
    setting('cue', numberReader ? '설정 비행 시간' : search ? '설정 탐색 시간' : '설정 자극 시간', `${cfg.speed}초`);
  }
  if (input.sessionSettings?.primary.trim()) {
    setting('session', input.sessionSettings.title ?? '사용한 설정', input.sessionSettings.primary);
    if (input.sessionSettings.secondary?.trim()) setting('session-detail', '추가 설정', input.sessionSettings.secondary);
  }
  if (distributionSupported && !counts) limitations.push('자극 분포: 현재 호출부에서 데이터 미전달 또는 유효한 집계값 없음.');
  const distribution = counts ? RESULT_COLOR_ORDER.map((key, index) => ({
    id: key,
    label: numberReader ? `숫자 ${index + 1}` : `${colorMeta(key).name}${search || zoneActivity ? ' 구역' : ''}`,
    color: colorMeta(key).bg,
    count: counts[key],
    // Relative count bars, no success-rate or rounded-percentage claims.
    width: counts[key] / Math.max(1, ...RESULT_COLOR_ORDER.map(k => counts[k])) * 100,
  })) : [];
  return {
    reason, title: CHILD_TITLES[reason], status: completion.statusBadge, description: completion.description,
    activityTitle: input.programTitle ?? selection.title,
    elapsed: Number.isFinite(elapsedMs) && elapsedMs >= 0 ? (elapsedMs === 0 ? '0초' : formatElapsedSeconds(elapsedMs)) : '시간 기록 미전달',
    volume, progress, facts, settings, distribution, recordNote, objective, meaning, nextChallenge, limitations,
    distributionKind: search || zoneActivity ? 'zone' : numberReader ? 'number' : 'color',
    activityDescription: search
      ? '여러 도형 중 목표를 구별하고 해당 위치를 찾아 움직이는 활동입니다. 시각정보를 살펴보고 위치를 선택하는 과정을 경험합니다.'
      : id === 'glass-bridge-memory' ? rich.programSummary : guide?.goal ?? objective,
    educationTags: search ? ['시각적 주의', '정보 선택', '시지각-운동 협응']
      : id === 'instant-memory' ? ['시각 기억', '공간 기억', '변화 탐지']
      : cfg.mode === 'spatial' ? ['시각 기억', '작업기억', '순차적 움직임']
      : dive ? ['시각 신호 구별', '움직임 전환', '리듬 유지']
      : rich.benefitTags.length ? rich.benefitTags.slice(0, 3) : ['시각적 주의', '규칙에 따른 반응', '시지각-운동 협응'],
    distributionTitle: search || zoneActivity ? '목표 구역별 출현' : numberReader ? '숫자별 출현' : '색상별 자극 제시',
    showFeeling: reason === 'natural_complete' || reason === 'stopped_early',
  };
}
