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
    title: '공간 반응',
    subtitle: '공간 반응',
    icon: 'SR',
    accent: '#3B82F6',
    settingsIntro:
      '공간 반응은 화면의 위치·색·방향 신호를 보고 몸으로 곧바로 반응하는 훈련 묶음입니다. 사분할·전면 색·조건 숫자 같은 패턴은 주로 반응 인지(basic) 엔진에서 다루고, 낙하·유성 자극은 시지각 반응(reactTrain) 등으로 이어질 수 있습니다. 아래 프로그램·스테이지 이름은 수업 설계용이며, 실제 신호·난이도는 선택한 엔진 모드·번에 맞춰 실행됩니다.',
    programs: [
      {
        programId: 'SR-01',
        title: '격자 매칭',
        stages: [
          { stage: 1, label: '단일 사분면',  engine: { mode: 'basic', level: 1 } },
          { stage: 2, label: '빠른 사분면',  engine: { mode: 'basic', level: 1 } },
          { stage: 3, label: '교대 사분면',  engine: { mode: 'basic', level: 1 } },
          { stage: 4, label: '방해 격자',    engine: { mode: 'basic', level: 3 } },
          { stage: 5, label: '혼합 격자',    engine: { mode: 'basic', level: 4 } },
        ],
      },
      {
        programId: 'SR-02',
        title: '전면 매칭',
        stages: [
          { stage: 1, label: '단일 색 채우기', engine: { mode: 'basic', level: 2 } },
          { stage: 2, label: '빠른 색 채우기', engine: { mode: 'basic', level: 2 } },
          { stage: 3, label: '플래시 채우기',  engine: { mode: 'basic', level: 2 } },
          { stage: 4, label: '지연 채우기',    engine: { mode: 'basic', level: 2 } },
          { stage: 5, label: '혼합 채우기',    engine: { mode: 'basic', level: 5 } },
        ],
      },
      {
        programId: 'SR-03',
        title: '방향 맵',
        stages: [
          { stage: 1, label: '기본 화살표',  engine: { mode: 'basic', level: 6 } },
          { stage: 2, label: '속도 화살표',  engine: { mode: 'basic', level: 6 } },
          { stage: 3, label: '방향 전환',    engine: { mode: 'basic', level: 6 } },
          // 사이먼(simon) 엔진은 간섭 제어(IC) 시리즈로 분류한다.
          { stage: 4, label: '교차 방향',    engine: null },
          { stage: 5, label: '혼합 방향',    engine: null },
        ],
      },
      {
        programId: 'SR-04',
        title: '조건 매핑',
        stages: [
          { stage: 1, label: '홀짝 규칙',     engine: { mode: 'basic', level: 7 } },
          { stage: 2, label: '좌우 규칙',     engine: { mode: 'basic', level: 7 } },
          { stage: 3, label: '앞뒤 규칙',     engine: { mode: 'basic', level: 7 } },
          { stage: 4, label: '크기 규칙',     engine: { mode: 'basic', level: 7 } },
          { stage: 5, label: '혼합 조건',     engine: { mode: 'basic', level: 7 } },
        ],
      },
      {
        programId: 'SR-05',
        title: '공간 플로우',
        stages: [
          { stage: 1, label: '기본 플로우',  engine: { mode: 'reactTrain', level: 1 } },
          { stage: 2, label: '전환 플로우',  engine: { mode: 'reactTrain', level: 2 } },
          { stage: 3, label: '혼합 플로우',  engine: { mode: 'reactTrain', level: 3 } },
        ],
      },
      {
        programId: 'SR-06',
        title: '공간 챌린지',
        stages: [
          { stage: 1, label: '정확도 챌린지', engine: { mode: 'reactTrain', level: 3 } },
          { stage: 2, label: '속도 챌린지',   engine: { mode: 'reactTrain', level: 4 } },
          { stage: 3, label: '혼합 챌린지',   engine: { mode: 'reactTrain', level: 5 } },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════
   * IC — Interference Control
   * ══════════════════════════════════════════ */
  {
    code: 'IC',
    title: '간섭 제어',
    subtitle: '간섭 제어',
    icon: 'IC',
    accent: '#A855F7',
    settingsIntro:
      '간섭 제어는 글자·배경·주변 자극이 겹칠 때 목표만 고르거나 억제하는 과제를 모았습니다. 스트룹·플랭커·고노고·사이먼 등 엔진마다 “무엇을 봐야 하는지”가 달라지므로, 같은 스테이지라도 모드·번에 맞는 상세 가이드를 함께 확인하면 수업 안내가 수월합니다.',
    programs: [
      {
        programId: 'IC-01',
        title: '스트룹 갈등',
        stages: [
          { stage: 1, label: '색-단어',         engine: { mode: 'stroop', level: 3 } },
          { stage: 2, label: '역규칙 단어',     engine: { mode: 'stroop', level: 3 } },
          { stage: 3, label: '화살표 갈등',     engine: { mode: 'stroop', level: 1 } },
          { stage: 4, label: '배경 간섭',       engine: { mode: 'stroop', level: 2 } },
          { stage: 5, label: '없는 색 말하기',  engine: { mode: 'stroop', level: 5 } },
        ],
      },
      {
        programId: 'IC-02',
        title: '사이먼(공간)',
        stages: [
          { stage: 1, label: '중앙 단서',       engine: { mode: 'simon', level: 1 } },
          { stage: 2, label: '무작위 위치',     engine: { mode: 'simon', level: 1 } },
          { stage: 3, label: '일치(정합) 조건', engine: { mode: 'simon', level: 1 } },
          { stage: 4, label: '불일치(부정합) 조건', engine: { mode: 'simon', level: 2 } },
          { stage: 5, label: '공간 함정',       engine: { mode: 'simon', level: 2 } },
        ],
      },
      {
        programId: 'IC-03',
        title: '플랭커 집중',
        stages: [
          { stage: 1, label: '3개 집중',    engine: { mode: 'flanker', level: 5 } },
          { stage: 2, label: '5개 집중',    engine: { mode: 'flanker', level: 1 } },
          { stage: 3, label: '색 플랭커',   engine: { mode: 'flanker', level: 3 } },
          { stage: 4, label: '혼합 플랭커', engine: { mode: 'flanker', level: 4 } },
          { stage: 5, label: '빠른 집중',   engine: { mode: 'flanker', level: 6 } },
        ],
      },
      {
        programId: 'IC-04',
        title: '역반응',
        stages: [
          { stage: 1, label: '반대 색',      engine: { mode: 'gonogo', level: 1 } },
          { stage: 2, label: '반대 방향',    engine: { mode: 'gonogo', level: 3 } },
          { stage: 3, label: '반대 위치',    engine: { mode: 'gonogo', level: 2 } },
          { stage: 4, label: '반(anti) 단서',engine: { mode: 'gonogo', level: 4 } },
          { stage: 5, label: '혼합 역반응',  engine: { mode: 'gonogo', level: 4 } },
        ],
      },
      {
        programId: 'IC-05',
        title: '간섭 플로우',
        stages: [
          { stage: 1, label: '기본 플로우',  engine: { mode: 'stroop', level: 1 } },
          { stage: 2, label: '심화 플로우',  engine: { mode: 'stroop', level: 4 } },
          { stage: 3, label: '혼합 플로우',  engine: { mode: 'stroop', level: 5 } },
        ],
      },
      {
        programId: 'IC-06',
        title: '간섭 챌린지',
        stages: [
          { stage: 1, label: '정확도 챌린지', engine: { mode: 'flanker', level: 3 } },
          { stage: 2, label: '속도 챌린지',   engine: { mode: 'flanker', level: 6 } },
          { stage: 3, label: '혼합 챌린지',   engine: { mode: 'flanker', level: 6 } },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════
   * RS — Rule Switching
   * ══════════════════════════════════════════ */
  {
    code: 'RS',
    title: '규칙 전환',
    subtitle: '규칙 전환',
    icon: 'RS',
    accent: '#A3E635',
    settingsIntro:
      'Rule Switching(규칙 전환)은 cue가 바뀔 때마다 적용 규칙이 달라지는 과제를 다룹니다. 고노고·과제 전환·이중 과제 등으로 “지금은 어떤 규칙인지”를 빠르게 읽는 연습이며, 스테이지 라벨은 커리큘럼 표기이고 실제 규칙 텍스트는 엔진 설정·가이드의 해당 번 설명을 따릅니다.',
    programs: [
      {
        programId: 'RS-01',
        title: '규칙 매칭',
        stages: [
          { stage: 1, label: '색 규칙',     engine: { mode: 'gonogo', level: 1 } },
          { stage: 2, label: '도형 규칙',   engine: { mode: 'gonogo', level: 2 } },
          { stage: 3, label: '위치 규칙',   engine: { mode: 'simon',  level: 1 } },
          { stage: 4, label: '규칙 매칭+',  engine: { mode: 'gonogo', level: 4 } },
        ],
      },
      {
        programId: 'RS-02',
        title: '단서 전환',
        stages: [
          { stage: 1, label: '단어 단서',   engine: { mode: 'taskswitch', level: 1 } },
          { stage: 2, label: '아이콘 단서', engine: { mode: 'taskswitch', level: 2 } },
          { stage: 3, label: '테두리 단서', engine: { mode: 'taskswitch', level: 3 } },
          { stage: 4, label: '숨은 단서',   engine: { mode: 'taskswitch', level: 3 } },
          { stage: 5, label: '빠른 전환',   engine: { mode: 'taskswitch', level: 3 } },
        ],
      },
      {
        programId: 'RS-03',
        title: '혼합 규칙',
        stages: [
          { stage: 1, label: '색 + 도형',   engine: { mode: 'gonogo',     level: 4 } },
          { stage: 2, label: '색 + 위치',   engine: { mode: 'taskswitch', level: 2 } },
          { stage: 3, label: '도형 + 방향', engine: { mode: 'taskswitch', level: 3 } },
          { stage: 4, label: '혼합 단서',   engine: { mode: 'taskswitch', level: 3 } },
        ],
      },
      {
        programId: 'RS-04',
        title: '이중 규칙',
        stages: [
          { stage: 1, label: '이중 매칭',  engine: null },
          { stage: 2, label: '이중 전환',  engine: null },
          { stage: 3, label: '이중 동작',  engine: null },
          { stage: 4, label: '이중 억제',  engine: null },
          { stage: 5, label: '혼합 이중',  engine: null },
        ],
      },
      {
        programId: 'RS-05',
        title: '규칙 플로우',
        stages: [
          { stage: 1, label: '기본 플로우', engine: { mode: 'taskswitch', level: 1 } },
          { stage: 2, label: '심화 플로우', engine: { mode: 'taskswitch', level: 2 } },
          { stage: 3, label: '혼합 플로우', engine: { mode: 'taskswitch', level: 3 } },
        ],
      },
      {
        programId: 'RS-06',
        title: '규칙 챌린지',
        stages: [
          { stage: 1, label: '정확도 챌린지', engine: { mode: 'taskswitch', level: 1 } },
          { stage: 2, label: '속도 챌린지',   engine: { mode: 'taskswitch', level: 2 } },
          { stage: 3, label: '혼합 챌린지',   engine: { mode: 'taskswitch', level: 3 } },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════
   * SM — Sequence Memory
   * ══════════════════════════════════════════ */
  {
    code: 'SM',
    title: '순차 기억',
    subtitle: '순차 기억',
    icon: 'SM',
    accent: '#22C55E',
    settingsIntro:
      'Sequence Memory(순차 기억)은 색 순서·조합을 기억했다가 재현하는 spatial 엔진 중심 시리즈입니다. 항목 수·지연·역순·선택 회상 등은 난이도(번)에 따라 화면 흐름이 달라집니다.',
    programs: [
      {
        programId: 'SM-01',
        title: '정방향 순서',
        stages: [
          { stage: 1, label: '2단계', engine: { mode: 'spatial', level: 1 } },
          { stage: 2, label: '3단계', engine: { mode: 'spatial', level: 1 } },
          { stage: 3, label: '4단계', engine: { mode: 'spatial', level: 2 } },
          { stage: 4, label: '5단계', engine: { mode: 'spatial', level: 2 } },
        ],
      },
      {
        programId: 'SM-02',
        title: '지연 순서',
        stages: [
          { stage: 1, label: '짧은 지연',  engine: { mode: 'spatial', level: 1 } },
          { stage: 2, label: '시각 지연',  engine: { mode: 'spatial', level: 3 } },
          { stage: 3, label: '청각 지연',  engine: { mode: 'spatial', level: 3 } },
          { stage: 4, label: '혼합 지연',  engine: { mode: 'spatial', level: 3 } },
        ],
      },
      {
        programId: 'SM-03',
        title: '역방향 순서',
        stages: [
          { stage: 1, label: '2단계 역순', engine: { mode: 'spatial', level: 1 } },
          { stage: 2, label: '3단계 역순', engine: { mode: 'spatial', level: 1 } },
          { stage: 3, label: '4단계 역순', engine: { mode: 'spatial', level: 2 } },
          { stage: 4, label: '혼합 역순',  engine: { mode: 'spatial', level: 3 } },
        ],
      },
      {
        programId: 'SM-04',
        title: '선택 회상',
        stages: [
          { stage: 1, label: '색 건너뛰기',     engine: { mode: 'spatial', level: 3 } },
          { stage: 2, label: '목표만',          engine: { mode: 'spatial', level: 3 } },
          { stage: 3, label: '처음-마지막 회상',engine: { mode: 'spatial', level: 4 } },
          { stage: 4, label: '순서 변경',       engine: { mode: 'spatial', level: 4 } },
          { stage: 5, label: '간섭 회상',       engine: { mode: 'spatial', level: 5 } },
        ],
      },
      {
        programId: 'SM-05',
        title: '기억 플로우',
        stages: [
          { stage: 1, label: '기본 플로우', engine: { mode: 'spatial', level: 1 } },
          { stage: 2, label: '심화 플로우', engine: { mode: 'spatial', level: 2 } },
          { stage: 3, label: '혼합 플로우', engine: { mode: 'spatial', level: 3 } },
        ],
      },
      {
        programId: 'SM-06',
        title: '기억 챌린지',
        stages: [
          { stage: 1, label: '스팬 챌린지',     engine: { mode: 'spatial', level: 2 } },
          { stage: 2, label: '정확도 챌린지',  engine: { mode: 'spatial', level: 4 } },
          { stage: 3, label: '혼합 챌린지',    engine: { mode: 'spatial', level: 5 } },
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
    title: '리듬 협응',
    subtitle: '리듬 협응',
    icon: 'RC',
    accent: '#14B8A6',
    settingsIntro:
      'Rhythm Coordination(리듬 협응)은 챌린지·플로우 임베드로 연습합니다. 아래 카탈로그의 스테이지 이름은 수업·로드맵용이며, 챌린지 스튜디오 템플릿과 자동으로 바뀌지는 않습니다. 음원·그리드는 iframe 쪽 설정을 따르며, 이 화면의 신호 속도·분량과 항상 1:1은 아닙니다.',
    programs: [
      {
        programId: 'RC-01',
        title: '비트 싱크',
        stages: [
          { stage: 1, label: '느린 비트',        engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: '기본 비트',        engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: '4비트 사이클',     engine: { mode: 'challenge', level: 1 } },
          { stage: 4, label: '강세 비트',        engine: { mode: 'challenge', level: 1 } },
        ],
      },
      {
        programId: 'RC-02',
        title: '키 리듬',
        stages: [
          { stage: 1, label: '단일 키',      engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: '2키 리듬',     engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: '4키 리듬',     engine: { mode: 'challenge', level: 1 } },
          { stage: 4, label: '콤보 노트',    engine: { mode: 'challenge', level: 1 } },
          { stage: 5, label: '템포 키',      engine: { mode: 'challenge', level: 1 } },
        ],
      },
      {
        programId: 'RC-03',
        title: '템포 전환',
        stages: [
          { stage: 1, label: '느림→빠름',     engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: '빠름→느림',     engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: '멀티 템포',     engine: { mode: 'challenge', level: 1 } },
          { stage: 4, label: '랜덤 템포',     engine: { mode: 'challenge', level: 1 } },
        ],
      },
      {
        programId: 'RC-04',
        title: '리듬 패턴',
        stages: [
          { stage: 1, label: '2패턴',       engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: '3패턴',       engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: '색 패턴',     engine: { mode: 'challenge', level: 1 } },
          { stage: 4, label: '스텝 패턴',   engine: { mode: 'challenge', level: 1 } },
          { stage: 5, label: '혼합 패턴',   engine: { mode: 'challenge', level: 1 } },
        ],
      },
      {
        programId: 'RC-05',
        title: '리듬 플로우',
        stages: [
          { stage: 1, label: '기본 플로우', engine: { mode: 'flow', level: 1 } },
          { stage: 2, label: '심화 플로우', engine: { mode: 'flow', level: 1 } },
          { stage: 3, label: '혼합 플로우', engine: { mode: 'flow', level: 1 } },
        ],
      },
      {
        programId: 'RC-06',
        title: '리듬 챌린지',
        stages: [
          { stage: 1, label: '정확도 챌린지', engine: { mode: 'challenge', level: 1 } },
          { stage: 2, label: '콤보 챌린지',   engine: { mode: 'challenge', level: 1 } },
          { stage: 3, label: '혼합 챌린지',   engine: { mode: 'challenge', level: 1 } },
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
