/**
 * Layer B — mechanics cluster → runtime source paths (+ optional extract markers).
 * Preset → cluster mapping for guide source drift.
 */

export type SpomoveGuideSourceClusterId =
  | 'reactionCognitionBasic'
  | 'visualRush'
  | 'visualFlowFlash'
  | 'visualMole'
  | 'visualGoalkeeper'
  | 'handFootBasicL7'
  | 'simonPoles'
  | 'simonCamouflage'
  | 'simonBalloon'
  | 'flankerSignals'
  | 'stroopSignals'
  | 'sequentialMemoryGame'
  | 'sequentialMemoryL4'
  | 'sequentialMemoryL5'
  | 'diveFlow'
  | 'engineRouter';

export type SpomoveGuideSourceExtract = {
  /** Inclusive start marker (first occurrence). */
  start: string;
  /** Exclusive end marker after start (first occurrence after start). Empty = EOF. */
  end?: string;
};

export type SpomoveGuideSourceClusterDef = {
  id: SpomoveGuideSourceClusterId;
  /** Repo-relative paths from project root. */
  files: readonly string[];
  extracts?: readonly SpomoveGuideSourceExtract[];
};

export const SPOMOVE_GUIDE_SOURCE_CLUSTERS: readonly SpomoveGuideSourceClusterDef[] = [
  {
    id: 'reactionCognitionBasic',
    files: ['app/admin/spomove/training/_player/lib/signals.ts'],
    extracts: [{ start: "if (mode === 'basic')", end: "if (mode === 'stroop')" }],
  },
  {
    id: 'visualRush',
    files: [
      'app/admin/spomove/training/_player/components/RushReactionTraining.tsx',
    ],
  },
  {
    id: 'visualFlowFlash',
    files: [
      'app/admin/spomove/training/_player/components/VisualReactionTraining.tsx',
    ],
  },
  {
    id: 'visualMole',
    files: [
      'app/admin/spomove/training/_player/components/RobloxMoleReactionTraining.tsx',
    ],
  },
  {
    id: 'visualGoalkeeper',
    files: [
      'app/admin/spomove/training/_player/components/GoalkeeperReactionTraining.tsx',
    ],
  },
  {
    id: 'handFootBasicL7',
    files: ['app/admin/spomove/training/_player/lib/signals.ts'],
    extracts: [
      {
        start: 'const difficulty = opts?.handFootDifficulty',
        end: '// level 8:',
      },
    ],
  },
  {
    id: 'simonPoles',
    files: ['app/admin/spomove/training/_player/lib/signals.ts'],
    extracts: [
      {
        start: 'export function createSimonSignalGenerator',
        end: 'export function signalFingerprint',
      },
    ],
  },
  {
    id: 'simonCamouflage',
    files: [
      'app/admin/spomove/training/_player/components/CamouflageReactionTraining.tsx',
    ],
  },
  {
    id: 'simonBalloon',
    files: [
      'app/admin/spomove/training/_player/components/VisualReactionTraining.tsx',
    ],
  },
  {
    id: 'flankerSignals',
    files: ['app/admin/spomove/training/_player/lib/signals.ts'],
    extracts: [{ start: "if (mode === 'flanker')", end: "if (mode === 'gonogo')" }],
  },
  {
    id: 'stroopSignals',
    files: ['app/admin/spomove/training/_player/lib/signals.ts'],
    extracts: [{ start: "if (mode === 'stroop')", end: "if (mode === 'dual')" }],
  },
  {
    id: 'sequentialMemoryGame',
    files: ['app/admin/spomove/training/_player/components/MemoryGame.tsx'],
  },
  {
    id: 'sequentialMemoryL4',
    files: ['app/admin/spomove/training/_player/components/MemoryGameLevel4.tsx'],
  },
  {
    id: 'sequentialMemoryL5',
    files: ['app/admin/spomove/training/_player/components/MemoryGameLevel5.tsx'],
  },
  {
    id: 'diveFlow',
    files: [
      'app/admin/spomove/training/_player/flow-lab/FlowGameClient.tsx',
      'app/admin/spomove/training/_player/flow-lab/engine/FlowEngine.ts',
      'app/admin/spomove/training/_player/flow-lab/engine/modules/colorGateGuides.ts',
    ],
  },
  {
    id: 'engineRouter',
    files: ['app/spokedu-master/spomove/session/EngineRouter.tsx'],
  },
];

const CLUSTER_BY_ID = Object.fromEntries(
  SPOMOVE_GUIDE_SOURCE_CLUSTERS.map((c) => [c.id, c]),
) as Record<SpomoveGuideSourceClusterId, SpomoveGuideSourceClusterDef>;

/**
 * Map active preset → primary runtime cluster(s).
 * engineRouter is always included as secondary for session routing drift.
 */
export function resolveSpomoveGuideSourceClustersForPreset(preset: {
  id: string;
  programGroup: string;
  engine: { mode: string; level: number; handFootDifficulty?: string; goalkeeperTier?: number };
}): SpomoveGuideSourceClusterId[] {
  const { id, programGroup, engine } = preset;
  const clusters: SpomoveGuideSourceClusterId[] = ['engineRouter'];

  if (programGroup === 'reaction-cognition') {
    clusters.push('reactionCognitionBasic');
    return unique(clusters);
  }

  if (programGroup === 'visual-reaction') {
    if (id.includes('rush')) clusters.push('visualRush');
    else if (id.includes('flow') || id.includes('flash')) clusters.push('visualFlowFlash');
    else if (id.includes('mole')) clusters.push('visualMole');
    else if (id.includes('goalkeeper')) clusters.push('visualGoalkeeper');
    else if (engine.handFootDifficulty) clusters.push('handFootBasicL7');
    else if (id.includes('hand-foot')) clusters.push('handFootBasicL7');
    else clusters.push('visualFlowFlash');
    return unique(clusters);
  }

  if (programGroup === 'simon') {
    if (engine.mode === 'simon' && engine.level === 4) clusters.push('simonCamouflage');
    else if (engine.mode === 'simon' && engine.level === 5) clusters.push('simonBalloon');
    else clusters.push('simonPoles');
    return unique(clusters);
  }

  if (programGroup === 'flanker') {
    clusters.push('flankerSignals');
    return unique(clusters);
  }

  if (programGroup === 'stroop') {
    if (engine.mode === 'basic') clusters.push('reactionCognitionBasic');
    else clusters.push('stroopSignals');
    return unique(clusters);
  }

  if (programGroup === 'sequential-memory') {
    if (engine.level === 4) clusters.push('sequentialMemoryL4');
    else if (engine.level === 5) clusters.push('sequentialMemoryL5');
    else clusters.push('sequentialMemoryGame');
    return unique(clusters);
  }

  if (programGroup === 'dive') {
    clusters.push('diveFlow');
    return unique(clusters);
  }

  return unique(clusters);
}

export function getSpomoveGuideSourceClusterDef(
  id: SpomoveGuideSourceClusterId,
): SpomoveGuideSourceClusterDef {
  return CLUSTER_BY_ID[id];
}

function unique(ids: SpomoveGuideSourceClusterId[]): SpomoveGuideSourceClusterId[] {
  return [...new Set(ids)];
}
