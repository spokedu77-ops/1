import { MODES, normalizeLegacyTrainingMode, resolveTrainingEngine, resolveReactTrainUiLevel, type ReactTrainUiLevelDefaults } from '../constants';

export type TrainingRuntime =
  | 'signals' | 'sequence-memory' | 'color-number-memory' | 'color-number-quiz' | 'instant-memory'
  | 'flow' | 'rush' | 'falling-bricks' | 'balloon' | 'beat-wave' | 'camouflage' | 'mole'
  | 'wormhole' | 'number-cart' | 'color-tracker' | 'goalkeeper' | 'virus' | 'shell-tracking'
  | 'relative-compass' | 'shape-completion' | 'simon-camouflage' | 'simon-balloon' | 'visual-search';

type Route = { mode: string; levels: readonly number[] };
type Definition = {
  routes: readonly Route[];
  catalog?: { mode: string; level: number; launchLevel: number };
  runtime: TrainingRuntime;
  title?: string;
  /** New catalog activities must never be inferred from an overlapping old number. */
  explicitOnly?: boolean;
};
const route = (mode: string, ...levels: number[]): Route => ({ mode, levels });
const catalog = (mode: string, level: number, launchLevel = level) => ({ mode, level, launchLevel });

/** All supported activities. Numbers below are compatibility addresses, never identities. */
export const TRAINING_ACTIVITIES = {
  'direction-cue': { routes: [route('basic', 1)], catalog: catalog('basic', 1), runtime: 'signals' },
  'quadrant-cue': { routes: [route('basic', 2)], catalog: catalog('basic', 2), runtime: 'signals' },
  'full-screen-cue': { routes: [route('basic', 3)], catalog: catalog('basic', 3), runtime: 'signals' },
  'two-panel-cue': { routes: [route('basic', 4)], catalog: catalog('basic', 4), runtime: 'signals' },
  'three-panel-cue': { routes: [route('basic', 5)], catalog: catalog('basic', 5), runtime: 'signals' },
  'random-panel-cue': { routes: [route('basic', 6)], catalog: catalog('basic', 6), runtime: 'signals' },
  'relative-compass': { routes: [route('basic', 7)], catalog: catalog('basic', 7), runtime: 'relative-compass', explicitOnly: true },
  'shape-completion': { routes: [route('basic', 8)], catalog: catalog('basic', 8), runtime: 'shape-completion', explicitOnly: true },
  'hand-foot': { routes: [route('basic', 7, 8, 9, 10), route('reactTrain', 201)], catalog: catalog('reactTrain', 201), runtime: 'signals' },
  'wave-dodge': { routes: [route('reactTrain', 1)], catalog: catalog('reactTrain', 1), runtime: 'rush' },
  'falling-bricks': { routes: [route('reactTrain', 2)], catalog: catalog('reactTrain', 2), runtime: 'falling-bricks' },
  'balloon-pop': { routes: [route('reactTrain', 3)], catalog: catalog('reactTrain', 3), runtime: 'balloon' },
  'beat-wave': { routes: [route('reactTrain', 4)], runtime: 'beat-wave', title: '리듬 반응' },
  'visual-camouflage': { routes: [route('reactTrain', 5, 41)], runtime: 'camouflage', title: '매직 아이' },
  'mole': { routes: [route('reactTrain', 6, 71)], catalog: catalog('reactTrain', 6), runtime: 'mole' },
  'wormhole': { routes: [route('reactTrain', 7)], runtime: 'wormhole', title: '웜홀' },
  'number-cart': { routes: [route('reactTrain', 8, 91, 92, 93)], catalog: catalog('reactTrain', 8), runtime: 'number-cart' },
  'color-tracker': { routes: [route('reactTrain', 9, 101, 102, 103)], catalog: catalog('reactTrain', 9), runtime: 'color-tracker' },
  'goalkeeper': { routes: [route('reactTrain', 10, 11)], catalog: catalog('reactTrain', 10), runtime: 'goalkeeper' },
  'virus-outbreak': { routes: [route('reactTrain', 13)], catalog: catalog('reactTrain', 13), runtime: 'virus' },
  'target-tracking': { routes: [route('reactTrain', 14)], catalog: catalog('reactTrain', 14), runtime: 'shell-tracking' },
  'simon-shape': { routes: [route('simon', 1)], catalog: catalog('simon', 1), runtime: 'signals' },
  'simon-arrow': { routes: [route('simon', 2)], catalog: catalog('simon', 2), runtime: 'signals' },
  'simon-theme': { routes: [route('simon', 3)], catalog: catalog('simon', 3), runtime: 'signals' },
  'simon-camouflage': { routes: [route('simon', 4)], catalog: catalog('simon', 4), runtime: 'simon-camouflage' },
  'simon-balloon': { routes: [route('simon', 5)], catalog: catalog('simon', 5), runtime: 'simon-balloon' },
  'flanker-arrow': { routes: [route('flanker', 1, 5)], catalog: catalog('flanker', 1), runtime: 'signals' },
  'flanker-theme': { routes: [route('flanker', 2, 6)], catalog: catalog('flanker', 2), runtime: 'signals' },
  'flanker-extreme': { routes: [route('flanker', 3)], catalog: catalog('flanker', 3), runtime: 'signals' },
  'flanker-nested': { routes: [route('flanker', 4)], catalog: catalog('flanker', 4), runtime: 'signals' },
  'visual-search': { routes: [route('flanker', 7)], catalog: catalog('flanker', 7), runtime: 'visual-search' },
  'stroop-arrow': { routes: [route('stroop', 1)], catalog: catalog('stroop', 1), runtime: 'signals' },
  'stroop-word': { routes: [route('stroop', 2)], catalog: catalog('stroop', 2), runtime: 'signals' },
  'stroop-word-advanced': { routes: [route('stroop', 3)], runtime: 'signals', title: '단어 의미·잉크 전환 심화' },
  'stroop-background-word': { routes: [route('stroop', 4, 5)], runtime: 'signals', title: '단어·배경 규칙' },
  'sequence-memory': { routes: [route('spatial', 1, 2, 3, 6)], catalog: catalog('spatial', 1), runtime: 'sequence-memory' },
  'color-number-memory': { routes: [route('spatial', 4)], catalog: catalog('spatial', 2, 4), runtime: 'color-number-memory' },
  'color-number-quiz': { routes: [route('spatial', 5)], runtime: 'color-number-quiz', title: '색·번호 기억 퀴즈' },
  'instant-memory': { routes: [route('spatial', 7)], catalog: catalog('spatial', 7), runtime: 'instant-memory' },
  'action-move': { routes: [route('flow', 1)], catalog: catalog('flow', 1), runtime: 'flow' },
  'motion-gate': { routes: [route('flow', 2)], catalog: catalog('flow', 2), runtime: 'flow' },
  'go-no-go-color': { routes: [route('gonogo', 1)], runtime: 'signals', title: '색상 Go/No-Go' },
  'go-no-go-shape': { routes: [route('gonogo', 2)], runtime: 'signals', title: '도형 Go/No-Go' },
  'go-no-go-action': { routes: [route('gonogo', 3)], runtime: 'signals', title: '동작 Go/No-Go' },
  'go-no-go-mixed': { routes: [route('gonogo', 4)], runtime: 'signals', title: '혼합 Go/No-Go' },
  'task-switch-basic': { routes: [route('taskswitch', 1)], runtime: 'signals', title: '규칙 전환' },
  'task-switch-reverse': { routes: [route('taskswitch', 2)], runtime: 'signals', title: '반대 규칙 전환' },
  'task-switch-mixed': { routes: [route('taskswitch', 3)], runtime: 'signals', title: '혼합 규칙 전환' },
} as const satisfies Record<string, Definition>;
export type TrainingActivityId = keyof typeof TRAINING_ACTIVITIES;
export type TrainingActivityInput = {
  /** `engine` is accepted only to read snapshots made by the interim implementation. */
  activityId?: TrainingActivityId | 'engine';
  relativeCompassEnabled?: boolean;
  shapeCompletionEnabled?: boolean;
};
const definitions: Record<TrainingActivityId, Definition> = TRAINING_ACTIVITIES;
function accepts(id: TrainingActivityId, mode: string, level: number) {
  return definitions[id].routes.some(r => r.mode === mode && r.levels.includes(level));
}
export function resolveTrainingActivity(mode: string, level: number, input: TrainingActivityInput = {}, fallback?: TrainingActivityId): TrainingActivityId {
  if (!mode || !Number.isInteger(level)) throw new Error('Invalid SPOMOVE activity address');
  const normalized = normalizeLegacyTrainingMode(mode, level);
  mode = normalized.mode;
  level = normalized.level;
  let id = input.activityId === 'engine' ? undefined : input.activityId;
  if (!id && mode === 'basic') {
    if (level === 7 && input.relativeCompassEnabled === true) id = 'relative-compass';
    if (level === 8 && input.shapeCompletionEnabled === true) id = 'shape-completion';
  }
  if (id) {
    if (!Object.prototype.hasOwnProperty.call(definitions, id) || !accepts(id, mode, level)) throw new Error(`SPOMOVE activity/address mismatch: ${id} (${mode}:${level})`);
    return id;
  }
  const hasLegacyIdentity = input.relativeCompassEnabled !== undefined || input.shapeCompletionEnabled !== undefined;
  if (input.activityId === undefined && !hasLegacyIdentity && fallback && accepts(fallback, mode, level)) return fallback;
  const matches = (Object.keys(definitions) as TrainingActivityId[]).filter(key => !definitions[key].explicitOnly && accepts(key, mode, level));
  if (matches.length !== 1) throw new Error(`Unregistered or ambiguous SPOMOVE activity address: ${mode}:${level}`);
  return matches[0]!;
}
export function catalogTrainingActivity(mode: string, catalogLevel: number): TrainingActivityId {
  const matches = (Object.keys(definitions) as TrainingActivityId[]).filter(key => definitions[key].catalog?.mode === mode && definitions[key].catalog?.level === catalogLevel);
  if (matches.length !== 1) throw new Error(`Unregistered or ambiguous SPOMOVE catalog activity: ${mode}:${catalogLevel}`);
  return matches[0]!;
}
/** An intentional sublevel change preserves the activity only while its address is compatible. */
export function trainingActivityForLevelChange(mode: string, level: number, previous: TrainingActivityId): TrainingActivityId {
  return accepts(previous, mode, level) ? previous : resolveTrainingActivity(mode, level);
}
export function trainingActivityDefinition(activityId: TrainingActivityId): Definition {
  return definitions[activityId];
}
export function trainingActivityPresentation(activityId: TrainingActivityId) {
  const def = definitions[activityId];
  const ref = def.catalog;
  const levels = ref ? MODES[ref.mode]?.levels : undefined;
  const index = levels?.findIndex(level => level.id === ref?.level) ?? -1;
  const item = index >= 0 ? levels?.[index] : undefined;
  return { catalogMode: ref?.mode, catalogLevel: ref?.level, number: index >= 0 ? index + 1 : null,
    title: item?.name ?? def.title ?? activityId, en: item?.enName ?? '', runtime: def.runtime };
}
export function resolveTrainingSelection(mode: string, level: number, input: TrainingActivityInput = {}) {
  const activityId = resolveTrainingActivity(mode, level, input);
  const normalized = normalizeLegacyTrainingMode(mode, level);
  const compatibilityDefaults: ReactTrainUiLevelDefaults = normalized.mode === 'reactTrain'
    ? resolveReactTrainUiLevel(normalized.level) : { engineLevel: normalized.level };
  const { engineMode: _mode, engineLevel: _level, ...optionDefaults } = compatibilityDefaults;
  return { ...normalized, activityId, optionDefaults, ...resolveTrainingEngine(normalized.mode, normalized.level), ...trainingActivityPresentation(activityId) };
}
/** Resolve a catalog choice atomically, including grouped memory sublevels. */
export function resolveCatalogTrainingSelection(mode: string, catalogLevel: number, current?: { level: number; activityId: TrainingActivityId }) {
  const activityId = catalogTrainingActivity(mode, catalogLevel);
  const level = current?.activityId === activityId && accepts(activityId, mode, current.level)
    ? current.level : definitions[activityId].catalog!.launchLevel;
  return resolveTrainingSelection(mode, level, { activityId });
}
export function legacyTrainingActivityFlags(activityId: TrainingActivityId) {
  return { relativeCompassEnabled: activityId === 'relative-compass', shapeCompletionEnabled: activityId === 'shape-completion' };
}
