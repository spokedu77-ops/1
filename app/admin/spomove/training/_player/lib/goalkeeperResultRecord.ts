export type GoalkeeperLaneCounts = [number, number, number, number];

/** Mirrors GoalkeeperReactionTraining.CORNERS: lane indices are NOT visual order. */
export const GOALKEEPER_RESULT_ZONES = [
  { id: 'TL', label: '좌측 상단', lane: 0, color: 'red' },
  { id: 'TR', label: '우측 상단', lane: 3, color: 'yellow' },
  { id: 'BL', label: '좌측 하단', lane: 2, color: 'green' },
  { id: 'BR', label: '우측 하단', lane: 1, color: 'blue' },
] as const;

export type GoalkeeperResultRecord = {
  tier: 1 | 2;
  /** Started regular waves, not arrived targets. Bonus does not increment this. */
  waveCount: number;
  targetWaveCount: number | null;
  /** Targets that reached their destination, including any played bonus. */
  stims: number;
  laneCount: GoalkeeperLaneCounts;
  regularLaneCount: GoalkeeperLaneCounts;
  bonusLaneCount: GoalkeeperLaneCounts;
  bonusStarted: boolean;
  baseTravelSeconds: number;
};

/** Detached reporting snapshot only. Never increments or changes engine counters. */
export function snapshotGoalkeeperResult(state: {
  tier: 1 | 2; waveCount: number; targetWaveCount: number | null; stims: number;
  laneCount: GoalkeeperLaneCounts; regularLaneCountAtBonus: GoalkeeperLaneCounts | null;
  bonusStarted: boolean; baseTravelSeconds: number;
}): GoalkeeperResultRecord {
  const regular = state.regularLaneCountAtBonus ?? state.laneCount;
  return {
    tier: state.tier, waveCount: state.waveCount, targetWaveCount: state.targetWaveCount, stims: state.stims,
    laneCount: [...state.laneCount], regularLaneCount: [...regular],
    bonusLaneCount: state.laneCount.map((count, lane) => count - regular[lane]!) as GoalkeeperLaneCounts,
    bonusStarted: state.bonusStarted, baseTravelSeconds: state.baseTravelSeconds,
  };
}

export function validGoalkeeperResult(record?: GoalkeeperResultRecord): record is GoalkeeperResultRecord {
  const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const lanes = (value: unknown): value is GoalkeeperLaneCounts => Array.isArray(value) && value.length === 4 && value.every(count);
  return !!record && (record.tier === 1 || record.tier === 2) && count(record.waveCount) && count(record.stims)
    && (record.targetWaveCount === null || count(record.targetWaveCount) && record.targetWaveCount > 0 && record.waveCount <= record.targetWaveCount)
    && Number.isFinite(record.baseTravelSeconds) && record.baseTravelSeconds > 0 && typeof record.bonusStarted === 'boolean'
    && lanes(record.laneCount) && lanes(record.regularLaneCount) && lanes(record.bonusLaneCount)
    && record.laneCount.reduce((sum, value) => sum + value, 0) === record.stims
    && record.laneCount.every((value, lane) => value === record.regularLaneCount[lane]! + record.bonusLaneCount[lane]!)
    && (record.bonusStarted || record.bonusLaneCount.every(value => value === 0));
}
