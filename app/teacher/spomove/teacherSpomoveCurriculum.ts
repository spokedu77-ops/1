import type { MemoryGameAutoLaunch } from '@/app/admin/spomove/training/_player/MemoryGameApp';
import { MEMORY_ROUNDS } from '@/app/admin/spomove/training/_player/constants';
import type { SpomoveColorThemeId } from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';

export type TeacherSpomoveFlowFeature = 'faster' | 'punch' | 'duck' | 'reach';

export type TeacherSpomoveProgram = {
  id: string;
  title: string;
  mode: string;
  level: number;
  speed?: number;
  targetReps?: number;
  duration?: number;
  flowDuration?: number;
  variantColorTheme?: SpomoveColorThemeId;
  reactTrainConcurrent?: 1 | 2 | 3;
  moleDualPanel?: boolean;
  bodyLabelMode?: 'easy' | 'hard';
  flowFeatures?: TeacherSpomoveFlowFeature[];
  displayChips?: string[];
};

export type TeacherSpomoveWeek = {
  week: number;
  label: string;
  summary: string;
  programs: TeacherSpomoveProgram[];
};

const STANDARD_SPEED = 3;
const STANDARD_REPS = 15;
const STANDARD_WARMUP = 3;
const REACT_TRAIN_DURATION_SEC = 30;
const FLOW_DURATION_SEC = 25;

function isModifiedQuadDisplayProgram(mode: string, level: number): boolean {
  return mode === 'basic' && level >= 7 && level <= 10;
}

function p(
  id: string,
  title: string,
  mode: string,
  level: number,
  extra: Omit<TeacherSpomoveProgram, 'id' | 'title' | 'mode' | 'level'> = {},
): TeacherSpomoveProgram {
  return { id, title, mode, level, ...extra };
}

function basic(id: string, title: string, level: number, speed: number, theme?: SpomoveColorThemeId) {
  return p(id, title, 'basic', level, {
    speed,
    targetReps: 15,
    variantColorTheme: theme,
    bodyLabelMode: isModifiedQuadDisplayProgram('basic', level) ? 'easy' : undefined,
  });
}

function stroop(id: string, title: string, level: number) {
  return p(id, title, 'stroop', level, {
    speed: 3,
    targetReps: 15,
  });
}

function reactTrain(
  id: string,
  title: string,
  level: number,
  speed: number,
  duration: number,
  extra: Omit<TeacherSpomoveProgram, 'id' | 'title' | 'mode' | 'level' | 'speed' | 'duration'> = {},
) {
  return p(id, title, 'reactTrain', level, {
    speed,
    duration,
    ...extra,
  });
}

function dive(
  id: string,
  title: string,
  flowDuration: number,
  flowFeatures: TeacherSpomoveFlowFeature[] = [],
  displayChips?: string[],
) {
  return p(id, title, 'flow', 1, {
    flowDuration,
    flowFeatures,
    displayChips,
  });
}

export const TEACHER_SPOMOVE_WEEKS: TeacherSpomoveWeek[] = [
  {
    week: 1,
    label: '1주차',
    summary: '반응인지와 스트룹으로 방향, 색상, 간섭 반응을 시작합니다.',
    programs: [
      basic('w1-rc-space', '반응인지 - 공간 방향', 1, 2.5),
      basic('w1-rc-quad-color', '반응인지 - 사분할 색상', 2, 2.5, 'color'),
      basic('w1-rc-full-color', '반응인지 - 전면색상: 색상', 3, 2.5, 'color'),
      stroop('w1-stroop-arrow', '스트룹 - 화살표 스트룹/역스트룹', 1),
      stroop('w1-stroop-arrow-bg', '스트룹 - 화살표/배경 간섭', 2),
    ],
  },
  {
    week: 2,
    label: '2주차',
    summary: '전면색상 테마와 시지각 반응 게임으로 반응 폭을 넓힙니다.',
    programs: [
      basic('w2-rc-full-animal', '반응인지 - 전면색상: 동물', 3, 2.5, 'animal'),
      basic('w2-rc-full-fruit', '반응인지 - 전면색상: 과일', 3, 2.5, 'fruit'),
      basic('w2-rc-full-food', '반응인지 - 전면색상: 음식', 3, 2.5, 'food'),
      reactTrain('w2-vr-balloon', '시지각 반응 - 풍선 터뜨리기 1개', 2, 2, 30),
      reactTrain('w2-vr-bricks', '시지각 반응 - 떨어지는 벽돌 2개', 1, 2.5, 60, {
        reactTrainConcurrent: 2,
      }),
    ],
  },
  {
    week: 3,
    label: '3주차',
    summary: '변형 사분할, 단어 스트룹, DIVE 기본 동작을 연결합니다.',
    programs: [
      basic('w3-rc-mod-quad-1', '반응인지 - 변형 사분할 1단계', 7, 3),
      basic('w3-rc-mod-quad-2', '반응인지 - 변형 사분할 2단계', 8, 3),
      stroop('w3-stroop-word', '스트룹 - 단어 스트룹/역스트룹', 3),
      stroop('w3-stroop-word-bg', '스트룹 - 단어+배경', 4),
      dive('w3-dive-basic', 'DIVE - 기본', 10, []),
      dive('w3-dive-speed', 'DIVE - 속도업', 15, ['faster']),
      dive('w3-dive-punch', 'DIVE - 펀치', 25, ['punch']),
    ],
  },
  {
    week: 4,
    label: '4주차',
    summary: '새 전면색상 테마, 두더지 반응, DIVE 복합 회피를 진행합니다.',
    programs: [
      basic('w4-rc-full-vehicle', '반응인지 - 전면색상: 탈 것', 3, 2, 'vehicle'),
      basic('w4-rc-full-nature', '반응인지 - 전면색상: 자연물', 3, 2, 'nature'),
      basic('w4-rc-full-emotion', '반응인지 - 전면색상: 감정', 3, 2, 'emotion'),
      reactTrain('w4-vr-mole-1', '시지각 반응 - 두더지 1개', 7, 2, 30),
      reactTrain('w4-vr-mole-2', '시지각 반응 - 두더지 2개', 7, 2, 30, {
        moleDualPanel: true,
      }),
      dive('w4-dive-basic', 'DIVE - 기본', 10, []),
      dive('w4-dive-speed', 'DIVE - 속도업', 15, ['faster']),
      dive('w4-dive-punch', 'DIVE - 펀치', 15, ['punch']),
      dive('w4-dive-duck', 'DIVE - 덕', 25, ['duck']),
      dive('w4-dive-all', 'DIVE - 전부 다', 25, ['faster', 'punch', 'duck', 'reach']),
    ],
  },
  {
    week: 5,
    label: '5주차',
    summary: '2패널과 3패널 반응인지에 DIVE 벽 반응을 더합니다.',
    programs: [
      basic('w5-rc-2panel-animal', '반응인지 - 2패널: 동물', 4, 3, 'animal'),
      basic('w5-rc-2panel-fruit', '반응인지 - 2패널: 과일', 4, 3, 'fruit'),
      basic('w5-rc-2panel-food', '반응인지 - 2패널: 음식', 4, 3, 'food'),
      basic('w5-rc-3panel-vehicle', '반응인지 - 3패널: 탈 것', 6, 3, 'vehicle'),
      basic('w5-rc-3panel-nature', '반응인지 - 3패널: 자연물', 6, 3, 'nature'),
      basic('w5-rc-3panel-emotion', '반응인지 - 3패널: 감정', 6, 3, 'emotion'),
      dive('w5-dive-basic', 'DIVE - 기본', 10, []),
      dive('w5-dive-speed', 'DIVE - 속도업', 15, ['faster']),
      dive('w5-dive-punch', 'DIVE - 펀치', 15, ['punch']),
      dive('w5-dive-duck', 'DIVE - 덕', 15, ['duck']),
      dive('w5-dive-wall', 'DIVE - 벽', 25, ['reach']),
      dive('w5-dive-all', 'DIVE - 전부 다', 30, ['faster', 'punch', 'duck', 'reach']),
    ],
  },
  {
    week: 6,
    label: '6주차',
    summary: '변형 사분할 3,4단계와 카모플라쥬 밸런스 무빙을 진행합니다.',
    programs: [
      p('w6-rc-mod-quad-3-easy', '반응인지 - 변형 사분할 3단계 이지', 'basic', 9, {
        speed: 3.5,
        targetReps: 15,
        bodyLabelMode: 'easy',
      }),
      p('w6-rc-mod-quad-4-easy', '반응인지 - 변형 사분할 4단계 이지', 'basic', 10, {
        speed: 3.5,
        targetReps: 15,
        bodyLabelMode: 'easy',
      }),
      reactTrain('w6-vr-camouflage-balance', '시지각 반응 - 카모플라쥬: 밸런스 무빙', 4, 3, 30),
      dive('w6-dive-basic', 'DIVE - 기본', 10, []),
      dive('w6-dive-speed', 'DIVE - 속도업', 15, ['faster']),
      dive('w6-dive-duck', 'DIVE - 덕', 15, ['duck']),
      dive('w6-dive-wall', 'DIVE - 벽', 15, ['reach']),
      dive('w6-dive-shake', 'DIVE - 쉐이크', 25, ['faster', 'duck'], ['DIVE', '쉐이크', '25초']),
      dive('w6-dive-all', 'DIVE - 전부 다', 30, ['faster', 'punch', 'duck', 'reach']),
    ],
  },
  {
    week: 7,
    label: '7주차',
    summary: '사이먼 효과와 플랭커 협동 점프를 DIVE 반복 세트와 결합합니다.',
    programs: [
      p('w7-simon-effect', '사이먼 효과', 'simon', 2, {
        speed: 2.5,
        targetReps: 15,
      }),
      p('w7-flanker-coop-jump', '플랭커 - 협동 점프', 'flanker', 1, {
        speed: 2.5,
        targetReps: 15,
      }),
      dive('w7-dive-basic', 'DIVE - 기본', 10, []),
      dive('w7-dive-speed', 'DIVE - 속도업', 15, ['faster']),
      dive('w7-dive-duck', 'DIVE - 덕', 15, ['duck']),
      dive('w7-dive-wall', 'DIVE - 벽', 15, ['reach']),
      dive('w7-dive-shake', 'DIVE - 쉐이크', 25, ['faster', 'duck'], ['DIVE', '쉐이크', '25초']),
      dive('w7-dive-all', 'DIVE - 전부 다', 30, ['faster', 'punch', 'duck', 'reach']),
    ],
  },
  {
    week: 8,
    label: '8주차',
    summary: '오징어 게임 콘셉트의 순차기억과 DIVE 종합 루틴으로 마무리합니다.',
    programs: [
      p('w8-memory-squid-1', '순차기억 - 1단계: 오징어 게임 활용', 'spatial', 1, {
        speed: STANDARD_SPEED,
        targetReps: MEMORY_ROUNDS,
      }),
      p('w8-memory-squid-2', '순차기억 - 2단계: 오징어 게임 활용', 'spatial', 2, {
        speed: STANDARD_SPEED,
        targetReps: MEMORY_ROUNDS,
      }),
      p('w8-memory-squid-3', '순차기억 - 3단계: 오징어 게임 활용', 'spatial', 3, {
        speed: STANDARD_SPEED,
        targetReps: MEMORY_ROUNDS,
      }),
      dive('w8-dive-basic', 'DIVE - 기본', 10, []),
      dive('w8-dive-speed', 'DIVE - 속도업', 15, ['faster']),
      dive('w8-dive-duck', 'DIVE - 덕', 15, ['duck']),
      dive('w8-dive-wall', 'DIVE - 벽', 15, ['reach']),
      dive('w8-dive-shake', 'DIVE - 쉐이크', 25, ['faster', 'duck'], ['DIVE', '쉐이크', '25초']),
      dive('w8-dive-all', 'DIVE - 전부 다', 30, ['faster', 'punch', 'duck', 'reach']),
    ],
  },
];

export function getTeacherWeek(week: number): TeacherSpomoveWeek | undefined {
  return TEACHER_SPOMOVE_WEEKS.find((w) => w.week === week);
}

export function buildTeacherAutoLaunch(program: TeacherSpomoveProgram): MemoryGameAutoLaunch {
  const base = {
    audioMode: 'beep' as const,
    warmup: STANDARD_WARMUP,
  };

  if (program.mode === 'spatial') {
    return {
      ...base,
      speed: program.speed ?? STANDARD_SPEED,
      timeMode: 'reps',
      targetReps: program.targetReps ?? MEMORY_ROUNDS,
      variantColorTheme: program.variantColorTheme,
    };
  }

  if (program.mode === 'flow') {
    return {
      ...base,
      timeMode: 'time',
      flowFeatures: program.flowFeatures ?? [],
      flowDuration: program.flowDuration ?? FLOW_DURATION_SEC,
      flowVisualVariant: 'plus',
    };
  }

  if (program.mode === 'reactTrain') {
    return {
      ...base,
      speed: program.speed ?? STANDARD_SPEED,
      timeMode: 'time',
      duration: program.duration ?? REACT_TRAIN_DURATION_SEC,
      reactTrainConcurrent: program.reactTrainConcurrent ?? 1,
      moleDualPanel: program.moleDualPanel,
    };
  }

  return {
    ...base,
    speed: program.speed ?? STANDARD_SPEED,
    timeMode: 'reps',
    targetReps: program.targetReps ?? STANDARD_REPS,
    variantColorTheme: program.variantColorTheme,
    bodyLabelMode: isModifiedQuadDisplayProgram(program.mode, program.level)
      ? 'easy'
      : program.bodyLabelMode,
    hideBodyLabelModeControls: isModifiedQuadDisplayProgram(program.mode, program.level),
  };
}

function formatSeconds(value: number): string {
  return Number.isInteger(value) ? `${value}초` : `${value.toFixed(1)}초`;
}

export function getProgramSettingChips(program: TeacherSpomoveProgram): string[] {
  if (program.displayChips) return program.displayChips;

  if (program.mode === 'spatial') {
    return [formatSeconds(program.speed ?? STANDARD_SPEED), `${program.targetReps ?? MEMORY_ROUNDS}라운드`, 'BGM 자동'];
  }

  if (program.mode === 'flow') {
    return ['DIVE', `${program.flowDuration ?? FLOW_DURATION_SEC}초`, 'BGM 자동'];
  }

  if (program.mode === 'reactTrain') {
    return [formatSeconds(program.speed ?? STANDARD_SPEED), `${program.duration ?? REACT_TRAIN_DURATION_SEC}초`, 'BGM 자동'];
  }

  return [formatSeconds(program.speed ?? STANDARD_SPEED), `${program.targetReps ?? STANDARD_REPS}회`, 'BGM 자동'];
}
