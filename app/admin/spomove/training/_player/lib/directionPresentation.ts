import type { TrainingActivityId } from './trainingActivity';
import type { TrainingResultConfig } from './trainingResultSummary';

const DIRECTION_RECORD_ACTIVITIES = new Set<TrainingActivityId>([
  'direction-cue', 'relative-compass', 'simon-arrow', 'flanker-arrow', 'stroop-arrow', 'go-no-go-action',
]);

/** Preserve the existing result-handoff predicate; do not infer records from display layout. */
export function shouldIncludeDirectionRecord(id: TrainingActivityId, cfg: Pick<TrainingResultConfig, 'flankerExtremeMode'>) {
  return DIRECTION_RECORD_ACTIVITIES.has(id) || (id === 'flanker-extreme' && cfg.flankerExtremeMode === 'arrow');
}

export const CARDINAL_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
export const ALL_DIRECTIONS = [...CARDINAL_DIRECTIONS, 'up-left', 'up-right', 'down-left', 'down-right'] as const;
export type DirectionId = typeof ALL_DIRECTIONS[number];
export type DirectionPresentationRecord = {
  directions: DirectionId[];
  counts: Partial<Record<DirectionId, number>>;
  signals: number;
  presented: number;
};
const isDirection = (value: unknown): value is DirectionId => typeof value === 'string' && (ALL_DIRECTIONS as readonly string[]).includes(value);

/** Read response targets only; flanker distractors and preparation cues are excluded. */
export function presentedDirectionIds(signal: Record<string, unknown>): DirectionId[] {
  const content = signal.content as Record<string, unknown> | undefined;
  if (!content) return [];
  let values: unknown[] = [];
  if (signal.type === 'arrow') values = [content.id];
  if (signal.type === 'flanker_arrows') values = [content.targetArrowId];
  if (signal.type === 'stroop_arrow') values = [content.arrowId];
  if (signal.type === 'simon_arrow') values = Array.isArray(content.items)
    ? content.items.map(item => (item as { arrowId?: unknown }).arrowId) : [content.arrowId];
  if (signal.type === 'gonogo_action' && content.kind === 'arrow') values = [content.arrowId];
  if (signal.type === 'task_switch' && content.stimulusKind === 'arrow') values = [content.arrowId];
  return values.filter(isDirection);
}

/** One collector per run. snapshot() returns detached data for result handoff. */
export function createDirectionPresentationCollector(directions: readonly DirectionId[] = CARDINAL_DIRECTIONS) {
  const seen = new Set<number>();
  const record: DirectionPresentationRecord = { directions: [...directions], counts: Object.fromEntries(directions.map(id => [id, 0])), signals: 0, presented: 0 };
  return {
    present(signal: Record<string, unknown>, key: number) {
      const ids = presentedDirectionIds(signal);
      if (!ids.length || seen.has(key)) return;
      seen.add(key);
      const content = signal.content as Record<string, unknown>;
      if (signal.type === 'flanker_arrows' && content.flankerArrowMode === 'lr' && record.signals === 0) {
        record.directions = ['left', 'right']; record.counts = { left: 0, right: 0 };
      }
      for (const id of ids) {
        if (!record.directions.includes(id)) record.directions.push(id);
        record.counts[id] = (record.counts[id] ?? 0) + 1;
      }
      record.signals += 1;
      record.presented += ids.length;
    },
    snapshot(): DirectionPresentationRecord { return { ...record, directions: [...record.directions], counts: { ...record.counts } }; },
  };
}

export function validDirectionRecord(value: DirectionPresentationRecord | undefined): value is DirectionPresentationRecord {
  return !!value && value.directions.length > 0 && new Set(value.directions).size === value.directions.length
    && value.directions.every(id => isDirection(id) && Number.isSafeInteger(value.counts[id]) && value.counts[id]! >= 0)
    && Number.isSafeInteger(value.presented) && value.presented >= 0
    && Number.isSafeInteger(value.signals) && value.signals >= 0 && value.signals <= value.presented
    && value.directions.reduce((sum, id) => sum + value.counts[id]!, 0) === value.presented;
}
