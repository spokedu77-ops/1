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
 * engine: { mode, level } → Training에서 Memory Game 엔진으로 연결
 * engine = null 이면 카탈로그에서 "준비 중"(비활성)
 * 같은 program 안에서 동일 (mode, level)이 2개 이상이면 전부 null로 정리(nullifyDuplicateEnginesPerProgram)
 */

export type SeriesCode = 'SR' | 'IC' | 'RS' | 'SM' | 'RC';

export type Core5Stage = {
  stage: number;
  label: string;
  /** 엔진 키: mode + level. null이면 아직 미구현 */
  engine: { mode: string; level: number } | null;
  /** Training 설정 — 스테이지 제목 아래 YouTube (watch / youtu.be) */
  settingsVideoUrl?: string;
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
  /** Training 설정 화면 상단 — 시리즈(큰 테마) 안내 (엔진 매핑과 별개의 에디토리얼) */
  settingsIntro?: string;
  /** Training 설정 — 시리즈 안내 펼침 영역 YouTube (watch / youtu.be) */
  settingsVideoUrl?: string;
  programs: Core5Program[];
};

export type Core5Catalog = Core5Series[];

/** program 단위: (mode, level) 중복 스테이지 → 준비 중(null) */
function nullifyDuplicateEnginesPerProgram(seed: Core5Catalog): Core5Catalog {
  return seed.map((series) => ({
    ...series,
    programs: series.programs.map((program) => {
      const counts = new Map<string, number>();
      for (const st of program.stages) {
        const e = st.engine;
        if (!e) continue;
        const k = `${e.mode}:${e.level}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const dup = new Set<string>();
      for (const [k, n] of counts) {
        if (n > 1) dup.add(k);
      }
      return {
        ...program,
        stages: program.stages.map((st) => {
          const e = st.engine;
          if (!e) return st;
          const k = `${e.mode}:${e.level}`;
          if (dup.has(k)) return { ...st, engine: null };
          return st;
        }),
      };
    }),
  }));
}

const catalogSeed: Core5Catalog = [
  /* ══════════════════════════════════════════
   * SR — Spatial Reaction
   * ══════════════════════════════════════════ */
  {
    code: 'SR',
    title: 'Spatial Reaction',
    subtitle: '공간 반응',
    icon: 'SR',
    accent: '#3B82F6',
    settingsIntro:
      'Spatial Reaction(공간 반응)은 화면의 위치·색·방향 신호를 보고 몸으로 곧바로 반응하는 훈련 묶음입니다. 사분할·전면 색·조건 숫자 같은 패턴은 주로 반응 인지(basic) 엔진에서 다루고, 방향·극단 배치는 사이먼(simon), 낙하·유성 자극은 시지각 반응(reactTrain) 등으로 이어질 수 있습니다. 아래 프로그램·스테이지 이름은 수업 설계용이며, 실제 신호·난이도는 선택한 엔진 모드·번에 맞춰 실행됩니다.',
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
    settingsIntro:
      'Interference Control(간섭 제어)은 글자·배경·주변 자극이 겹칠 때 목표만 고르거나 억제하는 과제를 모았습니다. 스트룹·플랭커·고노고 등 엔진마다 “무엇을 봐야 하는지”가 달라지므로, 같은 스테이지라도 모드·번에 맞는 상세 가이드를 함께 확인하면 수업 안내가 수월합니다.',
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
    settingsIntro:
      'Rule Switching(규칙 전환)은 cue가 바뀔 때마다 적용 규칙이 달라지는 과제를 다룹니다. 고노고·과제 전환·이중 과제 등으로 “지금은 어떤 규칙인지”를 빠르게 읽는 연습이며, 스테이지 라벨은 커리큘럼 표기이고 실제 규칙 텍스트는 엔진 설정·가이드의 해당 번 설명을 따릅니다.',
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
    settingsIntro:
      'Sequence Memory(순차 기억)은 색 순서·조합을 기억했다가 재현하는 spatial 엔진 중심 시리즈입니다. 항목 수·지연·역순·선택 회상 등은 난이도(번)에 따라 화면 흐름이 달라집니다.',
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
   * 각 스테이지의 engine은 훈련 포털에서 열 모드(challenge | flow)만 가리킵니다.
   * 스테이지 라벨 ↔ 챌린지 템플릿 자동 매핑은 없고, 임베드는 저장된 공용 설정 한 벌을 씁니다(MemoryGameApp).
   * ══════════════════════════════════════════ */
  {
    code: 'RC',
    title: 'Rhythm Coordination',
    subtitle: '리듬 협응',
    icon: 'RC',
    accent: '#14B8A6',
    settingsIntro:
      'Rhythm Coordination(리듬 협응)은 챌린지·플로우 임베드로 연습합니다. 아래 카탈로그의 스테이지 이름은 수업·로드맵용이며, 챌린지 스튜디오 템플릿과 자동으로 바뀌지는 않습니다. 음원·그리드는 iframe 쪽 설정을 따르며, 이 화면의 신호 속도·분량과 항상 1:1은 아닙니다.',
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

const catalog: Core5Catalog = nullifyDuplicateEnginesPerProgram(catalogSeed);

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
