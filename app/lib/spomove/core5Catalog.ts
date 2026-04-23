/**
 * SPOMOVE Core 5 — 카탈로그 정의
 *
 * 엔진 식별자 (mode, level)는 절대 바꾸지 않는다.
 * 이 파일은 "표현층" 전용이다.
 *
 * 구조:
 *   Core5Series (5)
 *   └─ Core5Program (6×5 = 30)
 *      └─ Core5Stage (n, 실제 engine level과 1:1 또는 N:1 매핑)
 *
 * engine: { mode, level } → /admin/memory-game?mode=X&level=Y 로 라우팅
 * engine.mode = null 이거나 engine.level = null 이면 "준비 중" 처리
 */

export type SeriesCode = 'SR' | 'IC' | 'RS' | 'SM' | 'RC';

export type Core5Stage = {
  stage: number;
  label: string;
  /** 엔진 키: mode + level. null이면 아직 미구현 */
  engine: { mode: string; level: number } | null;
};

export type Core5Program = {
  programId: string;   // e.g. "SR-01"
  title: string;
  stages: Core5Stage[];
};

export type Core5Series = {
  code: SeriesCode;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  programs: Core5Program[];
};

export type Core5Catalog = Core5Series[];

const catalog: Core5Catalog = [
  /* ══════════════════════════════════════════
   * SR — Spatial Reaction
   * ══════════════════════════════════════════ */
  {
    code: 'SR',
    title: 'Spatial Reaction',
    subtitle: '공간 반응',
    icon: 'SR',
    accent: '#3B82F6',
    programs: [
      {
        programId: 'SR-01',
        title: 'Grid Match',
        stages: [
          { stage: 1, label: 'Single Quadrant',  engine: { mode: 'basic', level: 1 } },
          { stage: 2, label: 'Fast Quadrant',    engine: { mode: 'basic', level: 1 } },
          { stage: 3, label: 'Alternating Quadrant', engine: { mode: 'basic', level: 1 } },
          { stage: 4, label: 'Distractor Grid',  engine: { mode: 'basic', level: 3 } },
          { stage: 5, label: 'Mixed Grid',       engine: { mode: 'basic', level: 4 } },
        ],
      },
      {
        programId: 'SR-02',
        title: 'Full Screen Match',
        stages: [
          { stage: 1, label: 'Single Color Fill',  engine: { mode: 'basic', level: 2 } },
          { stage: 2, label: 'Fast Color Fill',    engine: { mode: 'basic', level: 2 } },
          { stage: 3, label: 'Flash Fill',         engine: { mode: 'basic', level: 2 } },
          { stage: 4, label: 'Delayed Fill',       engine: { mode: 'basic', level: 2 } },
          { stage: 5, label: 'Mixed Fill',         engine: { mode: 'basic', level: 5 } },
        ],
      },
      {
        programId: 'SR-03',
        title: 'Direction Map',
        stages: [
          { stage: 1, label: 'Arrow Basic',    engine: { mode: 'basic', level: 6 } },
          { stage: 2, label: 'Arrow Speed',    engine: { mode: 'basic', level: 6 } },
          { stage: 3, label: 'Direction Shift',engine: { mode: 'basic', level: 6 } },
          { stage: 4, label: 'Cross Direction',engine: { mode: 'simon', level: 1 } },
          { stage: 5, label: 'Mixed Direction',engine: { mode: 'simon', level: 2 } },
        ],
      },
      {
        programId: 'SR-04',
        title: 'Conditional Mapping',
        stages: [
          { stage: 1, label: 'Odd-Even Rule',   engine: { mode: 'basic', level: 7 } },
          { stage: 2, label: 'Left-Right Rule',  engine: { mode: 'basic', level: 7 } },
          { stage: 3, label: 'Front-Back Rule',  engine: { mode: 'basic', level: 7 } },
          { stage: 4, label: 'Magnitude Rule',   engine: { mode: 'basic', level: 7 } },
          { stage: 5, label: 'Mixed Conditional',engine: { mode: 'basic', level: 7 } },
        ],
      },
      {
        programId: 'SR-05',
        title: 'Spatial Flow',
        stages: [
          { stage: 1, label: 'Basic Flow',  engine: { mode: 'reactTrain', level: 1 } },
          { stage: 2, label: 'Shift Flow',  engine: { mode: 'reactTrain', level: 2 } },
          { stage: 3, label: 'Mixed Flow',  engine: { mode: 'reactTrain', level: 3 } },
        ],
      },
      {
        programId: 'SR-06',
        title: 'Spatial Challenge',
        stages: [
          { stage: 1, label: 'Accuracy Challenge', engine: { mode: 'reactTrain', level: 4 } },
          { stage: 2, label: 'Speed Challenge',    engine: { mode: 'reactTrain', level: 5 } },
          { stage: 3, label: 'Mixed Challenge',    engine: { mode: 'reactTrain', level: 5 } },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════
   * IC — Interference Control
   * ══════════════════════════════════════════ */
  {
    code: 'IC',
    title: 'Interference Control',
    subtitle: '간섭 제어',
    icon: 'IC',
    accent: '#A855F7',
    programs: [
      {
        programId: 'IC-01',
        title: 'Stroop Conflict',
        stages: [
          { stage: 1, label: 'Color Word',        engine: { mode: 'stroop', level: 3 } },
          { stage: 2, label: 'Reverse Word',      engine: { mode: 'stroop', level: 3 } },
          { stage: 3, label: 'Arrow Conflict',    engine: { mode: 'stroop', level: 1 } },
          { stage: 4, label: 'Background Conflict',engine: { mode: 'stroop', level: 2 } },
          { stage: 5, label: 'Missing Color',     engine: { mode: 'stroop', level: 5 } },
        ],
      },
      {
        programId: 'IC-02',
        title: 'Simon Spatial',
        stages: [
          { stage: 1, label: 'Center Cue',       engine: { mode: 'simon', level: 1 } },
          { stage: 2, label: 'Random Position',  engine: { mode: 'simon', level: 1 } },
          { stage: 3, label: 'Congruent Trial',  engine: { mode: 'simon', level: 1 } },
          { stage: 4, label: 'Incongruent Trial',engine: { mode: 'simon', level: 2 } },
          { stage: 5, label: 'Spatial Trap',     engine: { mode: 'simon', level: 2 } },
        ],
      },
      {
        programId: 'IC-03',
        title: 'Flanker Focus',
        stages: [
          { stage: 1, label: 'Three Focus',  engine: { mode: 'flanker', level: 5 } },
          { stage: 2, label: 'Five Focus',   engine: { mode: 'flanker', level: 1 } },
          { stage: 3, label: 'Color Flanker',engine: { mode: 'flanker', level: 3 } },
          { stage: 4, label: 'Mixed Flanker',engine: { mode: 'flanker', level: 4 } },
          { stage: 5, label: 'Fast Focus',   engine: { mode: 'flanker', level: 6 } },
        ],
      },
      {
        programId: 'IC-04',
        title: 'Inverse Response',
        stages: [
          { stage: 1, label: 'Opposite Color',    engine: { mode: 'gonogo', level: 1 } },
          { stage: 2, label: 'Opposite Direction',engine: { mode: 'gonogo', level: 3 } },
          { stage: 3, label: 'Opposite Position', engine: { mode: 'gonogo', level: 2 } },
          { stage: 4, label: 'Anti Cue',          engine: { mode: 'gonogo', level: 4 } },
          { stage: 5, label: 'Mixed Inverse',     engine: { mode: 'gonogo', level: 4 } },
        ],
      },
      {
        programId: 'IC-05',
        title: 'Interference Flow',
        stages: [
          { stage: 1, label: 'Basic Flow',   engine: { mode: 'stroop', level: 1 } },
          { stage: 2, label: 'Advanced Flow',engine: { mode: 'stroop', level: 4 } },
          { stage: 3, label: 'Combo Flow',   engine: { mode: 'stroop', level: 5 } },
        ],
      },
      {
        programId: 'IC-06',
        title: 'Interference Challenge',
        stages: [
          { stage: 1, label: 'Accuracy Challenge',engine: { mode: 'flanker', level: 3 } },
          { stage: 2, label: 'Speed Challenge',   engine: { mode: 'flanker', level: 6 } },
          { stage: 3, label: 'Mixed Challenge',   engine: { mode: 'flanker', level: 6 } },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════
   * RS — Rule Switching
   * ══════════════════════════════════════════ */
  {
    code: 'RS',
    title: 'Rule Switching',
    subtitle: '규칙 전환',
    icon: 'RS',
    accent: '#A3E635',
    programs: [
      {
        programId: 'RS-01',
        title: 'Rule Match',
        stages: [
          { stage: 1, label: 'Color Rule',    engine: { mode: 'gonogo', level: 1 } },
          { stage: 2, label: 'Shape Rule',    engine: { mode: 'gonogo', level: 2 } },
          { stage: 3, label: 'Position Rule', engine: { mode: 'simon',  level: 1 } },
          { stage: 4, label: 'Rule Match Plus',engine: { mode: 'gonogo', level: 4 } },
        ],
      },
      {
        programId: 'RS-02',
        title: 'Cue Switch',
        stages: [
          { stage: 1, label: 'Word Cue',   engine: { mode: 'taskswitch', level: 1 } },
          { stage: 2, label: 'Icon Cue',   engine: { mode: 'taskswitch', level: 2 } },
          { stage: 3, label: 'Border Cue', engine: { mode: 'taskswitch', level: 3 } },
          { stage: 4, label: 'Hidden Cue', engine: { mode: 'taskswitch', level: 3 } },
          { stage: 5, label: 'Fast Switch',engine: { mode: 'taskswitch', level: 3 } },
        ],
      },
      {
        programId: 'RS-03',
        title: 'Mixed Rules',
        stages: [
          { stage: 1, label: 'Color + Shape',    engine: { mode: 'gonogo',    level: 4 } },
          { stage: 2, label: 'Color + Position', engine: { mode: 'taskswitch',level: 2 } },
          { stage: 3, label: 'Shape + Direction',engine: { mode: 'taskswitch',level: 3 } },
          { stage: 4, label: 'Mixed Cue',        engine: { mode: 'taskswitch',level: 3 } },
        ],
      },
      {
        programId: 'RS-04',
        title: 'Dual Rule',
        stages: [
          { stage: 1, label: 'Dual Match',    engine: { mode: 'dual', level: 1 } },
          { stage: 2, label: 'Dual Switch',   engine: { mode: 'dual', level: 2 } },
          { stage: 3, label: 'Dual Action',   engine: { mode: 'dual', level: 2 } },
          { stage: 4, label: 'Dual Inhibition',engine: { mode: 'dual', level: 2 } },
          { stage: 5, label: 'Mixed Dual',    engine: { mode: 'dual', level: 2 } },
        ],
      },
      {
        programId: 'RS-05',
        title: 'Rule Flow',
        stages: [
          { stage: 1, label: 'Basic Flow',   engine: { mode: 'taskswitch', level: 1 } },
          { stage: 2, label: 'Advanced Flow',engine: { mode: 'taskswitch', level: 2 } },
          { stage: 3, label: 'Combo Flow',   engine: { mode: 'taskswitch', level: 3 } },
        ],
      },
      {
        programId: 'RS-06',
        title: 'Rule Challenge',
        stages: [
          { stage: 1, label: 'Accuracy Challenge',engine: { mode: 'taskswitch', level: 1 } },
          { stage: 2, label: 'Speed Challenge',   engine: { mode: 'taskswitch', level: 2 } },
          { stage: 3, label: 'Mixed Challenge',   engine: { mode: 'taskswitch', level: 3 } },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════
   * SM — Sequence Memory
   * ══════════════════════════════════════════ */
  {
    code: 'SM',
    title: 'Sequence Memory',
    subtitle: '순차 기억',
    icon: 'SM',
    accent: '#22C55E',
    programs: [
      {
        programId: 'SM-01',
        title: 'Forward Sequence',
        stages: [
          { stage: 1, label: '2-Step',engine: { mode: 'spatial', level: 1 } },
          { stage: 2, label: '3-Step',engine: { mode: 'spatial', level: 1 } },
          { stage: 3, label: '4-Step',engine: { mode: 'spatial', level: 2 } },
          { stage: 4, label: '5-Step',engine: { mode: 'spatial', level: 2 } },
        ],
      },
      {
        programId: 'SM-02',
        title: 'Delayed Sequence',
        stages: [
          { stage: 1, label: 'Short Delay', engine: { mode: 'spatial', level: 1 } },
          { stage: 2, label: 'Visual Delay',engine: { mode: 'spatial', level: 3 } },
          { stage: 3, label: 'Audio Delay', engine: { mode: 'spatial', level: 3 } },
          { stage: 4, label: 'Mixed Delay', engine: { mode: 'spatial', level: 3 } },
        ],
      },
      {
        programId: 'SM-03',
        title: 'Reverse Sequence',
        stages: [
          { stage: 1, label: '2-Step Reverse',engine: { mode: 'spatial', level: 1 } },
          { stage: 2, label: '3-Step Reverse',engine: { mode: 'spatial', level: 1 } },
          { stage: 3, label: '4-Step Reverse',engine: { mode: 'spatial', level: 2 } },
          { stage: 4, label: 'Mixed Reverse', engine: { mode: 'spatial', level: 3 } },
        ],
      },
      {
        programId: 'SM-04',
        title: 'Selective Recall',
        stages: [
          { stage: 1, label: 'Skip Color',       engine: { mode: 'spatial', level: 3 } },
          { stage: 2, label: 'Only Target',      engine: { mode: 'spatial', level: 3 } },
          { stage: 3, label: 'First-Last Recall',engine: { mode: 'spatial', level: 4 } },
          { stage: 4, label: 'Changed Order',    engine: { mode: 'spatial', level: 4 } },
          { stage: 5, label: 'Interference Recall',engine: { mode: 'spatial', level: 5 } },
        ],
      },
      {
        programId: 'SM-05',
        title: 'Memory Flow',
        stages: [
          { stage: 1, label: 'Basic Flow',   engine: { mode: 'spatial', level: 1 } },
          { stage: 2, label: 'Advanced Flow',engine: { mode: 'spatial', level: 2 } },
          { stage: 3, label: 'Combo Flow',   engine: { mode: 'spatial', level: 3 } },
        ],
      },
      {
        programId: 'SM-06',
        title: 'Memory Challenge',
        stages: [
          { stage: 1, label: 'Span Challenge',    engine: { mode: 'spatial', level: 2 } },
          { stage: 2, label: 'Accuracy Challenge',engine: { mode: 'spatial', level: 4 } },
          { stage: 3, label: 'Mixed Challenge',   engine: { mode: 'spatial', level: 5 } },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════
   * RC — Rhythm Coordination
   * ══════════════════════════════════════════ */
  {
    code: 'RC',
    title: 'Rhythm Coordination',
    subtitle: '리듬 협응',
    icon: 'RC',
    accent: '#14B8A6',
    programs: [
      {
        programId: 'RC-01',
        title: 'Beat Sync',
        stages: [
          { stage: 1, label: 'Slow Beat',       engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: 'Basic Beat',      engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: 'Four Beat Cycle', engine: { mode: 'challenge', level: 1 } },
          { stage: 4, label: 'Accent Beat',     engine: { mode: 'challenge', level: 1 } },
        ],
      },
      {
        programId: 'RC-02',
        title: 'Key Rhythm',
        stages: [
          { stage: 1, label: 'Single Key',   engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: 'Two Key Rhythm',engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: 'Four Key Rhythm',engine: { mode: 'challenge', level: 1 } },
          { stage: 4, label: 'Combo Notes',  engine: { mode: 'challenge', level: 1 } },
          { stage: 5, label: 'Tempo Key',    engine: { mode: 'challenge', level: 1 } },
        ],
      },
      {
        programId: 'RC-03',
        title: 'Tempo Shift',
        stages: [
          { stage: 1, label: 'Slow to Fast',  engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: 'Fast to Slow',  engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: 'Multi Tempo',   engine: { mode: 'challenge', level: 1 } },
          { stage: 4, label: 'Random Tempo',  engine: { mode: 'challenge', level: 1 } },
        ],
      },
      {
        programId: 'RC-04',
        title: 'Rhythm Pattern',
        stages: [
          { stage: 1, label: 'Two Pattern',   engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: 'Three Pattern', engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: 'Color Pattern', engine: { mode: 'challenge', level: 1 } },
          { stage: 4, label: 'Step Pattern',  engine: { mode: 'challenge', level: 1 } },
          { stage: 5, label: 'Mixed Pattern', engine: { mode: 'challenge', level: 1 } },
        ],
      },
      {
        programId: 'RC-05',
        title: 'Rhythm Flow',
        stages: [
          { stage: 1, label: 'Basic Flow',   engine: { mode: 'flow', level: 1 } },
          { stage: 2, label: 'Advanced Flow',engine: { mode: 'flow', level: 1 } },
          { stage: 3, label: 'Combo Flow',   engine: { mode: 'flow', level: 1 } },
        ],
      },
      {
        programId: 'RC-06',
        title: 'Rhythm Challenge',
        stages: [
          { stage: 1, label: 'Accuracy Challenge',engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: 'Combo Challenge',   engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: 'Mixed Challenge',   engine: { mode: 'challenge', level: 1 } },
        ],
      },
    ],
  },
];

export default catalog;

/** 특정 programId + stage로 엔진 키를 조회 */
export function getEngineKey(
  programId: string,
  stage: number,
): { mode: string; level: number } | null {
  for (const series of catalog) {
    for (const program of series.programs) {
      if (program.programId === programId) {
        return program.stages.find((s) => s.stage === stage)?.engine ?? null;
      }
    }
  }
  return null;
}

/** (mode, level) → 해당 카탈로그 엔트리들(N:1 가능) */
export function findCatalogEntries(
  mode: string,
  level: number,
): { series: SeriesCode; programId: string; stage: number; label: string }[] {
  const results: ReturnType<typeof findCatalogEntries> = [];
  for (const series of catalog) {
    for (const program of series.programs) {
      for (const s of program.stages) {
        if (s.engine?.mode === mode && s.engine.level === level) {
          results.push({ series: series.code, programId: program.programId, stage: s.stage, label: s.label });
        }
      }
    }
  }
  return results;
}
