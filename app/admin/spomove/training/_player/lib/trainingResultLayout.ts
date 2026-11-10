import { SPATIAL_ARROW_COLOR_BY_DIRECTION } from '../constants';
import type { TrainingActivityId } from './trainingActivity';
import type { TrainingResultConfig, ColorStimulusCounts } from './trainingResultSummary';
import { validDirectionRecord, type DirectionPresentationRecord } from './directionPresentation';

const ARROW_ACTIVITIES = new Set<TrainingActivityId>([
  'direction-cue', 'relative-compass', 'simon-arrow', 'flanker-arrow', 'stroop-arrow', 'go-no-go-action',
]);
const COLOR_ACTIVITIES = new Set<TrainingActivityId>([
  'quadrant-cue', 'full-screen-cue', 'two-panel-cue', 'three-panel-cue', 'random-panel-cue', 'hand-foot',
  'wave-dodge', 'falling-bricks', 'balloon-pop', 'beat-wave', 'visual-camouflage', 'mole', 'wormhole',
  'number-cart', 'color-tracker', 'goalkeeper', 'virus-outbreak', 'motion-gate',
  'simon-shape', 'simon-theme', 'simon-camouflage', 'simon-balloon', 'visual-search',
  'flanker-theme', 'flanker-extreme', 'flanker-nested',
  'stroop-word', 'stroop-word-advanced', 'stroop-background-word',
  'sequence-memory', 'instant-memory', 'color-number-memory', 'color-number-quiz', 'glass-bridge-memory',
  'go-no-go-color', 'go-no-go-shape', 'go-no-go-mixed',
  'task-switch-basic', 'task-switch-reverse', 'task-switch-mixed',
]);

/** Layout follows the authored stimulus, even when a result has no aggregate. */
export function resolveTrainingResultLayout(id: TrainingActivityId, cfg: TrainingResultConfig) {
  if (ARROW_ACTIVITIES.has(id) || (id === 'flanker-extreme' && cfg.flankerExtremeMode === 'arrow')) return 'direction';
  if (id === 'moving-number-reader') return 'number';
  return COLOR_ACTIVITIES.has(id) ? 'color' : 'education';
}

const DIRECTIONS = [
  { id: 'up-left', label: '좌상단', icon: '↖', diagonal: true },
  { id: 'up', label: '상단', icon: '↑', diagonal: false },
  { id: 'up-right', label: '우상단', icon: '↗', diagonal: true },
  { id: 'left', label: '좌측', icon: '←', diagonal: false },
  { id: 'right', label: '우측', icon: '→', diagonal: false },
  { id: 'down-left', label: '좌하단', icon: '↙', diagonal: true },
  { id: 'down', label: '하단', icon: '↓', diagonal: false },
  { id: 'down-right', label: '우하단', icon: '↘', diagonal: true },
] as const;

/** Only invert counters that are a proven one-to-one direction encoding.
 * Stroop counters mix fill-color and response targets, so they cannot be
 * interpreted as arrow directions. Missing direction data never becomes zero.
 */
export function buildDirectionResult(id: TrainingActivityId, cfg: TrainingResultConfig, counts: ColorStimulusCounts | null, presented?: number) {
  // A reduced palette may leave a direction's arrow white. Only invert this
  // color mode when every presented single-arrow cue is accounted for.
  const completeColorArrowRecord = id === 'direction-cue' && cfg.spatialArrowColorMode === 'color'
    && Number.isSafeInteger(presented) && counts !== null
    && Object.values(SPATIAL_ARROW_COLOR_BY_DIRECTION).reduce((sum, color) => sum + counts[color], 0) === presented;
  const encoded = id === 'flanker-arrow' || id === 'simon-arrow'
    || (id === 'flanker-extreme' && cfg.flankerExtremeMode === 'arrow')
    || completeColorArrowRecord;
  const valid = counts !== null && Object.values(SPATIAL_ARROW_COLOR_BY_DIRECTION)
    .every(color => Number.isSafeInteger(counts[color]) && counts[color] >= 0);
  const cells = DIRECTIONS.map(direction => {
    const color = direction.id in SPATIAL_ARROW_COLOR_BY_DIRECTION
      ? SPATIAL_ARROW_COLOR_BY_DIRECTION[direction.id as keyof typeof SPATIAL_ARROW_COLOR_BY_DIRECTION] : null;
    return { ...direction, supported: !direction.diagonal || id === 'relative-compass',
      count: encoded && valid && color ? counts![color] : null };
  });
  const peak = Math.max(0, ...cells.map(cell => cell.count ?? 0));
  const leaders = cells.filter(cell => cell.count === peak && peak > 0);
  const measured = cells.filter(cell => cell.count !== null);
  const note = !measured.length ? '방향별 제시 횟수는 별도로 집계되지 않은 활동입니다.'
    : peak === 0 ? '이번 활동에서 집계된 방향 신호는 없어요.'
    : leaders.length === measured.length ? '네 방향의 신호가 같은 횟수로 제시됐어요.'
    : `${leaders.map(cell => `${cell.label}(${cell.icon})`).join(' · ')} 방향 신호가 가장 많이 나타났어요.`;
  return { cells: cells.map(cell => ({ ...cell, mostFrequent: peak > 0 && cell.count === peak })), note,
    subtitle: id === 'relative-compass' ? '현재 위치를 기준으로 읽는 방향 신호' : '화면에 제시되는 방향 신호 · 4방향',
    badge: id === 'relative-compass' ? '상대 방향' : '방향 신호' };
}

/** New runs use direct presentation evidence; historical records are not backfilled. */
export function buildRecordedDirectionResult(record: DirectionPresentationRecord | undefined) {
  if (!validDirectionRecord(record)) return { cells: [], note: null, subtitle: '화면에 제시된 방향 기록', badge: '방향 신호' };
  const peak = Math.max(0, ...record.directions.map(id => record.counts[id]!));
  const cells = DIRECTIONS.filter(direction => record.directions.includes(direction.id)).map(direction => ({
    ...direction, supported: true, count: record.counts[direction.id]!, mostFrequent: peak > 0 && record.counts[direction.id] === peak,
  }));
  return { cells, note: null, subtitle: `실제 제시된 목표 화살표 ${record.presented}개`, badge: `${cells.length}방향` };
}
