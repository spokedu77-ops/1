type Lanes = [number, number, number, number];
export type MoleResultRecord = {
  regularRounds: number;
  bonusRounds: number;
  targetRounds: number | null;
  bonusStarted: boolean;
  stims: number;
  laneCount: Lanes;
  regularLaneCount: Lanes;
  bonusLaneCount: Lanes;
};

/** A round is one appearance; paired moles are two targets in that round. */
export function snapshotMoleResult(state: {
  spawnCount: number; regularSpawnCountAtBonus: number | null;
  regularLaneCountAtBonus: Lanes | null; targetRounds: number | null;
  bonusStarted: boolean; stims: number; laneCount: Lanes;
}): MoleResultRecord {
  const regular = state.regularLaneCountAtBonus ?? state.laneCount;
  return {
    regularRounds: state.regularSpawnCountAtBonus ?? state.spawnCount,
    bonusRounds: state.bonusStarted ? state.spawnCount : 0,
    targetRounds: state.targetRounds, bonusStarted: state.bonusStarted, stims: state.stims,
    laneCount: [...state.laneCount], regularLaneCount: [...regular],
    bonusLaneCount: state.laneCount.map((value, lane) => value - regular[lane]!) as Lanes,
  };
}

export function validMoleResult(record?: MoleResultRecord): record is MoleResultRecord {
  const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const lanes = (value: unknown): value is Lanes => Array.isArray(value) && value.length === 4 && value.every(count);
  return !!record && count(record.regularRounds) && count(record.bonusRounds) && count(record.stims)
    && (record.targetRounds === null || count(record.targetRounds) && record.targetRounds > 0 && record.regularRounds <= record.targetRounds)
    && typeof record.bonusStarted === 'boolean'
    && lanes(record.laneCount) && lanes(record.regularLaneCount) && lanes(record.bonusLaneCount)
    && record.laneCount.reduce((a, b) => a + b, 0) === record.stims
    && record.laneCount.every((value, lane) => value === record.regularLaneCount[lane]! + record.bonusLaneCount[lane]!)
    && (record.bonusStarted || record.bonusRounds === 0 && record.bonusLaneCount.every(value => value === 0));
}
