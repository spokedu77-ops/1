import { resolveTrainingSelection } from './trainingActivity';
import { resolveTrainingResultKind } from './trainingResultKind';
import { buildTrainingResultViewModel, type TrainingResultViewInput, type ResultFact } from './trainingResultViewModel';
import { selectEnhancedResultEducation, selectEnhancedResultReflection } from './trainingResultEducation';
import { formatElapsedSeconds, RESULT_COLOR_ORDER } from './trainingResultSummary';
import { NUMBER_READER_ZONES } from './movingNumberReader';
import { validDirectionRecord } from './directionPresentation';
import { GOALKEEPER_RESULT_ZONES, validGoalkeeperResult, type GoalkeeperResultRecord } from './goalkeeperResultRecord';
import { resolveDiveActionMoveIds } from './diveActionMoveReport';
import type { GlassBridgeResult } from './glassBridgeMemory';

export type TrainingResultV2Input = TrainingResultViewInput & { goalkeeperRecord?: GoalkeeperResultRecord };
export const validResultCount = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
const fact = (id: string, label: string, value: string): ResultFact => ({ id, label, value });
const countFact = (id: string, label: string, value: unknown, unit: string): ResultFact[] => validResultCount(value) ? [fact(id, label, `${value}${unit}`)] : [];

/** Teacher results must be internally consistent. Invalid input is never converted to a score or zero. */
export function validTeacherResult(value?: GlassBridgeResult): value is GlassBridgeResult {
  if (!value || ![3, 4, 5, 6].includes(value.startLength) || !Number.isSafeInteger(value.lastLength) || value.lastLength < value.startLength || value.lastLength > 7
    || ![value.presentedRounds, value.successRounds, value.failureRounds].every(validResultCount) || typeof value.teacherFailed !== 'boolean') return false;
  if (value.scoringMode === undefined) return value.successRounds <= value.presentedRounds;
  return value.scoringMode === 'color-choice' && validResultCount(value.completedRounds) && value.completedRounds <= value.presentedRounds
    && value.successRounds + value.failureRounds === value.completedRounds
    && validResultCount(value.correctSteps) && validResultCount(value.incorrectSteps)
    && value.correctSteps + value.incorrectSteps >= value.completedRounds * value.startLength
    && value.incorrectSteps >= value.failureRounds && value.correctSteps >= value.successRounds * value.startLength
    && (value.difficulty === undefined || value.difficulty === 'easy' || value.difficulty === 'hard')
    && value.correctSteps + value.incorrectSteps <= value.presentedRounds * 7;
}

export function buildTrainingResultV2Model(input: TrainingResultV2Input, seed = 0) {
  const selection = resolveTrainingSelection(input.cfg.mode, input.cfg.level, { activityId: input.cfg.activityId });
  const cfg = { ...input.cfg, activityId: selection.activityId };
  const kind = resolveTrainingResultKind(cfg);
  const timeVolume = input.volumeLabel ?? (input.diveActionMove?.stageDurationSec != null ? `단계당 ${input.diveActionMove.stageDurationSec}초` : '기록 없음');
  const id = selection.activityId;
  const teacher = kind === 'teacher' && validTeacherResult(input.glassBridge) ? input.glassBridge : undefined;
  const safeInput = { ...input, cfg, glassBridge: teacher };
  const vm = buildTrainingResultViewModel(safeInput);
  const education = selectEnhancedResultEducation(safeInput, seed);
  const reflection = selectEnhancedResultReflection(education, seed);
  const facts: ResultFact[] = [];
  const settings: ResultFact[] = [];
  let progress: number | undefined;
  let progressLabel = '진행 기록';
  let progressUnit = '회';
  let note = '실제로 전달된 기록만 표시합니다.';
  let feature: string | null = null;
  let zones: { id: string; label: string; count: number | null; position: number }[] = [];
  const countsValid = input.colorCounts !== null && RESULT_COLOR_ORDER.every(key => validResultCount(input.colorCounts?.[key]));
  const distribution = kind === 'number'
    ? NUMBER_READER_ZONES.map(item => ({ id: String(item.number), label: `숫자 ${item.number}`, count: countsValid ? input.colorCounts![item.id] : null }))
    : vm.distribution.map(item => ({ id: item.id, label: item.label, count: item.count }));

  if (kind === 'teacher') {
    progressLabel = teacher?.scoringMode === 'color-choice' ? '정답 공개 완료' : '패턴 제시 완료';
    progressUnit = '라운드';
    progress = teacher?.scoringMode === 'color-choice' ? teacher.completedRounds : teacher?.presentedRounds;
    note = teacher?.scoringMode === 'color-choice' ? '교사가 입력한 색과 정답을 비교한 기록입니다. 정답 공개 횟수는 성공 횟수가 아닙니다.'
      : '교사가 수동으로 입력한 판정 기록입니다. 실패 시 같은 단계의 재시도와 제시 횟수는 별개입니다.';
    if (teacher) {
      facts.push(...countFact('presented', '패턴 제시 완료', teacher.presentedRounds, '라운드'), ...countFact('success', teacher.scoringMode === 'color-choice' ? '모두 맞힌 라운드' : '교사 성공 판정', teacher.successRounds, '라운드'),
        ...countFact('failure', teacher.scoringMode === 'color-choice' ? '오답이 있던 라운드' : '교사 실패 판정', teacher.failureRounds, teacher.scoringMode === 'color-choice' ? '라운드' : '회'), fact('length', '마지막 기록 단계', `${teacher.lastLength}칸`));
      if (teacher.scoringMode === 'color-choice') facts.push(...countFact('correct', '입력 색 일치', teacher.correctSteps, '개'), ...countFact('incorrect', '입력 색 불일치', teacher.incorrectSteps, '개'));
      if (teacher.presentedRounds > 0) feature = `마지막 기록 단계는 ${teacher.lastLength}칸이었어요.`;
    }
    const difficulty = teacher?.difficulty ?? cfg.glassBridgeDifficulty;
    if (difficulty) settings.push(fact('exposure', '설정 제시 방식', difficulty === 'easy' ? '전체 패턴 20초' : cfg.speed != null ? `발판당 ${cfg.speed}초` : '발판별 제시'));
  } else if (kind === 'sequence') {
    // stims is not a pattern-round count in these runtimes; do not invent one from authored volume.
    note = '설정된 기억 구성과 실제로 기억한 개수는 다릅니다. 정답 공개는 수행 성공 판정이 아닙니다.';
    if (id === 'sequence-memory') {
      settings.push(fact('length', '설정 기억 길이', cfg.level === 1 ? '3색' : cfg.level === 2 ? '5색' : cfg.level === 3 ? '3→7색' : '10색'));
      settings.push(fact('timing', '색상당 노출 시간', cfg.adminSequenceTiming ? '1~2.5초 랜덤' : cfg.level <= 3 ? '1~3초 랜덤' : cfg.speed != null ? `${cfg.speed}초` : '기록 없음'));
    } else settings.push(fact('items', '설정된 연합 구성', id === 'color-number-memory' ? '색·번호 10개 + 퀴즈 5문항' : '색·번호 기억 퀴즈'));
    settings.push(fact('volume', '설정 분량', input.volumeLabel ?? vm.volume));
    if (id === 'sequence-memory' && validResultCount(input.stims)) {
      progress = input.stims; progressLabel = '완료된 제시'; progressUnit = '라운드';
      facts.push(fact('progress', '실제 진행 라운드', `${input.stims}라운드`));
    } else facts.push(fact('progress-missing', '실제 진행 라운드', '기록 없음'));
  } else if (kind === 'instant') {
    progress = validResultCount(input.stims) ? input.stims : undefined; progressLabel = '완료된 제시'; progressUnit = '라운드';
    note = '격자 크기와 제시 라운드의 기록입니다. 기억 성공 여부나 정답 위치를 자동 판정하지 않습니다.';
    if (cfg.colorMemoryGridSize) settings.push(fact('grid', '사용한 격자', `${cfg.colorMemoryGridSize}×${cfg.colorMemoryGridSize}`));
    if (cfg.colorMemoryGridMode) settings.push(fact('mode', '설정 제시 방식', cfg.colorMemoryGridMode === 'oneshot' ? '전체 배치 제시' : '순차 점등'));
    if (progress !== undefined) facts.push(...countFact('rounds', '완료된 제시 라운드', progress, '라운드'));
    if (cfg.colorMemoryGridSize) feature = `설정된 격자는 ${cfg.colorMemoryGridSize}×${cfg.colorMemoryGridSize}예요.`;
  } else if (kind === 'time') {
    note = '단계·동작은 사용한 설정입니다. 실제 동작 횟수나 완료 단계 수를 자동 측정한 기록이 아닙니다.';
    if (input.diveActionMove) {
      const actions = resolveDiveActionMoveIds(input.diveActionMove);
      const labels = { SIDE: '방향 전환', JUMP: '점프', DUCK: '숙이기', BONUS: '보너스' };
      if (actions.length) settings.push(fact('actions', '설정된 움직임', actions.map(action => labels[action]).join(' · ')));
      if (input.diveActionMove.flowFeatures?.length) settings.push(fact('modules', '설정 동작 모듈', input.diveActionMove.flowFeatures.map(key => ({ punch: '펀치', kick: '킥', duck: '숙이기', reach: '뻗기', faster: '빠른 움직임', colorGate: '색상 게이트' }[key] ?? key)).join(' · ')));
      if (input.diveActionMove.stageDurationSec != null) settings.push(fact('stage', '설정 단계 시간', `${input.diveActionMove.stageDurationSec}초`));
    }
    settings.push(fact('volume', '설정된 실행 구성', timeVolume));
    facts.push(fact('elapsed', '실제 활동 시간', vm.elapsed));
  } else {
    progress = kind === 'direction' && validDirectionRecord(input.directionRecord) ? input.directionRecord.signals : validResultCount(input.stims) ? input.stims : undefined;
    progressLabel = id === 'visual-search' ? '탐색 과제 제시' : ['number-cart', 'color-tracker'].includes(id) ? '공개 완료' : ['shape-completion', 'target-tracking'].includes(id) ? '완료된 과제' : '신호 제시';
    progressUnit = ['number-cart', 'color-tracker', 'shape-completion', 'target-tracking'].includes(id) ? '라운드' : '회';
    if (kind === 'direction' && validDirectionRecord(input.directionRecord)) facts.push(fact('arrows', '목표 화살표 제시', `${input.directionRecord.presented}개`));
    if (kind === 'zone') {
      if (id === 'goalkeeper' && validGoalkeeperResult(input.goalkeeperRecord)) {
        const record = input.goalkeeperRecord;
        zones = GOALKEEPER_RESULT_ZONES.map((zone, position) => ({ id: zone.id, label: zone.label, count: record.laneCount[zone.lane], position }));
        progress = record.waveCount; progressLabel = '시작된 일반 웨이브';
        facts.push(fact('targets', '전체 목표 도착', `${record.stims}회`), fact('regular', '일반 목표 도착', `${record.regularLaneCount.reduce((a, b) => a + b, 0)}회`), fact('bonus', '보너스 목표 도착', record.bonusStarted ? `${record.bonusLaneCount.reduce((a, b) => a + b, 0)}회` : '진행 전'));
        note = '도착 구역 기준 집계입니다. 구역 기록에는 진행된 보너스가 포함되며, 일반 웨이브 수와 목표 수는 다릅니다.';
      } else if (['visual-search', 'color-tracker', 'number-cart', 'goalkeeper'].includes(id)) {
        // Existing handoff: trackers/cart use TL/TR/BL/BR order, while generic lanes use R/B/G/Y.
        const keys = id === 'number-cart' || id === 'color-tracker' ? ['red', 'blue', 'green', 'yellow'] as const : RESULT_COLOR_ORDER;
        const names = id === 'number-cart' ? ['좌측 끝 문', '좌측 안쪽 문', '우측 안쪽 문', '우측 끝 문'] : ['좌측 상단', '우측 상단', '좌측 하단', '우측 하단'];
        zones = keys.map((key, position) => ({ id: key, label: names[position]!, count: countsValid ? input.colorCounts![key] : null, position }));
        note = id === 'color-tracker' ? '정답 공개 시점의 목표 구역입니다. 목표 수와 공개 라운드 수는 서로 구분합니다.'
          : id === 'number-cart' ? '기차가 도착한 문을 집계한 기록입니다. 네 문은 화면의 좌측부터 우측으로 놓입니다.'
          : id === 'goalkeeper' ? '목표가 도착한 구역별 집계입니다. 일반 웨이브·보너스 분리 기록은 전달되지 않았습니다.' : '제시된 목표 기호의 구역 기록입니다. 과제 수와 목표 수는 다를 수 있습니다.';
        if (countsValid) facts.push(fact('targets', id === 'visual-search' ? '제시된 목표 기호' : '집계된 목표', `${zones.reduce((n, zone) => n + zone.count!, 0)}개`));
      } else note = '진행 기록만 제공됩니다. 개별 목표의 구역 기록은 전달되지 않았습니다.';
    }
    if (progress !== undefined) facts.unshift(fact('progress', progressLabel, `${progress}${progressUnit}`));
    if (kind === 'number') note = '화면에 실제로 표시된 숫자 캡슐을 집계합니다. 캡슐의 색이 아니라 숫자 1~4의 기록입니다.';
  }
  if (!settings.length) settings.push(...vm.settings);
  const values = kind === 'zone' ? zones : distribution;
  const known = values.filter(item => item.count !== null);
  const peak = Math.max(0, ...known.map(item => item.count!));
  if (!feature && peak > 0 && known.length === values.length) {
    const leaders = known.filter(item => item.count === peak).map(item => item.label);
    feature = leaders.length === values.length ? '집계된 모든 항목이 같은 횟수로 기록되었어요.' : `${leaders.join('·')}${kind === 'zone' ? ' 구역이' : ' 항목이'} ${leaders.length > 1 ? '같은 횟수로 ' : ''}가장 많이 기록되었어요.`;
  }
  const configured = kind === 'time' ? timeVolume : input.volumeLabel ?? vm.volume;
  const speed = settings.find(item => ['timing', 'exposure'].includes(item.id))?.value ?? (cfg.speed != null && Number.isFinite(cfg.speed) && cfg.speed > 0 ? `${cfg.speed}초` : '기록 없음');
  const metrics = [
    { label: '활동 시간', value: Number.isFinite(input.elapsedMs) && input.elapsedMs >= 0 ? input.elapsedMs === 0 ? '0초' : formatElapsedSeconds(input.elapsedMs) : '기록 없음', note: '실제 진행 시간' },
    kind === 'time' ? { label: '활동 구성', value: input.diveActionMove ? '설정 구성' : '기록 없음', note: '계획된 단계·동작과 실제 수행량 구분' }
      : { label: progressLabel, value: progress === undefined ? '기록 없음' : `${progress}${progressUnit}`, note: kind === 'sequence' ? '설정 분량과 실제 진행은 다릅니다' : '실제로 전달된 진행 기록' },
    { label: kind === 'time' ? '설정 분량' : kind === 'instant' ? '사용한 격자' : kind === 'sequence' ? '기억 구성' : kind === 'number' ? '숫자 비행 시간' : id === 'visual-search' ? '탐색 설정 시간' : '사용한 설정',
      value: kind === 'time' ? input.volumeLabel && cfg.duration > 0 ? `${cfg.duration}초` : input.diveActionMove ? '설정 구성' : '기록 없음' : kind === 'instant' ? cfg.colorMemoryGridSize ? `${cfg.colorMemoryGridSize}×${cfg.colorMemoryGridSize}` : '기록 없음' : kind === 'sequence' ? settings[0]?.value ?? '기록 없음' : speed,
      note: kind === 'time' ? configured : '실제 수행 성과가 아닌 실행 설정' },
  ];
  return { kind, id, cfg, teacher, vm, education, reflection, facts, settings, zones, distribution, metrics, feature, note, horizontalZones: id === 'number-cart' };
}
