/**
 * Operation URL query ser/de (O3). opv=1 canonical.
 */
import type {
  ActivityOperationConfig,
  ActivityOperationPatch,
  ActivityTimingConfig,
  EquipmentId,
  EquipmentMode,
  ParticipationFormat,
  ParticipantScale,
  StartZone,
} from './operationTypes';

export const OPERATION_QUERY_VERSION = '1';

export type OperationQueryFields = {
  opv?: string;
  startZone?: string;
  participant?: string;
  equipmentMode?: string;
  equipmentId?: string;
  timing?: string;
  format?: string;
  work?: string;
  rest?: string;
  sets?: string;
};

const START_ZONES: StartZone[] = ['onMat', 'adjacentToMat', 'externalSpot'];
const SCALES: ParticipantScale[] = ['individual', 'pair', 'smallGroup', 'team'];
const EQUIP_MODES: EquipmentMode[] = ['none', 'hold', 'balance', 'connect', 'manipulate'];
const EQUIP_IDS: EquipmentId[] = ['beanbag', 'band', 'funstick', 'ball', 'racket'];
const FORMATS: ParticipationFormat[] = [
  'independent',
  'synchronized',
  'alternating',
  'cooperative',
  'competitive',
];

function asEnum<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function parsePositiveInt(raw: string | null | undefined): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export function parseOperationQuery(
  params: URLSearchParams | OperationQueryFields,
): ActivityOperationPatch | null {
  const get = (key: keyof OperationQueryFields) => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    return params[key];
  };

  const opv = get('opv');
  if (opv != null && opv !== OPERATION_QUERY_VERSION) {
    // unknown version — ignore operation axes
    return null;
  }

  const startZone = asEnum(get('startZone'), START_ZONES);
  const participantScale = asEnum(get('participant'), SCALES);
  const equipmentMode = asEnum(get('equipmentMode'), EQUIP_MODES);
  const equipmentId = asEnum(get('equipmentId'), EQUIP_IDS);
  const participationFormat = asEnum(get('format'), FORMATS);
  const timingPattern = get('timing');

  let timing: ActivityTimingConfig | undefined;
  if (timingPattern === 'continuous' || timingPattern === 'responseWindow') {
    timing = { pattern: timingPattern };
  } else if (timingPattern === 'sequence' || timingPattern === 'builtIn') {
    timing = { pattern: timingPattern };
  } else if (timingPattern === 'interval') {
    const work = parsePositiveInt(get('work'));
    const rest = parsePositiveInt(get('rest'));
    const sets = parsePositiveInt(get('sets'));
    if (work != null && rest != null && sets != null) {
      timing = { pattern: 'interval', workSeconds: work, restSeconds: rest, sets };
    }
  } else if (timingPattern === 'shuttle') {
    // shuttle query reserved; incomplete → omit (sanitize later)
  }

  const patch: ActivityOperationPatch = {};
  if (startZone) patch.startZone = startZone;
  if (participantScale) patch.participantScale = participantScale;
  if (equipmentMode) {
    patch.equipment = { mode: equipmentMode };
    if (equipmentMode !== 'none' && equipmentId) patch.equipment.equipmentId = equipmentId;
  }
  if (participationFormat) patch.participationFormat = participationFormat;
  if (timing) patch.timing = timing;

  return Object.keys(patch).length > 0 ? patch : null;
}

/** Canonical write — drops irrelevant fields. */
export function writeOperationQuery(
  operation: ActivityOperationConfig,
  target: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  target.set('opv', OPERATION_QUERY_VERSION);
  target.set('startZone', operation.startZone);
  target.set('participant', operation.participantScale);
  target.set('equipmentMode', operation.equipment.mode);
  if (operation.equipment.mode !== 'none' && operation.equipment.equipmentId) {
    target.set('equipmentId', operation.equipment.equipmentId);
  } else {
    target.delete('equipmentId');
  }
  target.set('timing', operation.timing.pattern);
  target.set('format', operation.participationFormat);

  if (operation.timing.pattern === 'interval') {
    target.set('work', String(operation.timing.workSeconds));
    target.set('rest', String(operation.timing.restSeconds));
    target.set('sets', String(operation.timing.sets));
  } else {
    target.delete('work');
    target.delete('rest');
    target.delete('sets');
  }

  return target;
}
