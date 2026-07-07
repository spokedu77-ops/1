import type { MemoryGameAutoLaunch } from '@/app/admin/spomove/training/_player/MemoryGameApp';
import { MEMORY_ROUNDS } from '@/app/admin/spomove/training/_player/constants';
import type { SpomoveColorThemeId } from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';

export type TeacherSpomoveFlowFeature = 'punch' | 'duck' | 'reach';

export type TeacherSpomoveProgram = {
  id: string;
  title: string;
  mode: string;
  level: number;
  variantColorTheme?: SpomoveColorThemeId;
  reactTrainConcurrent?: 1 | 2 | 3;
  flowFeatures?: TeacherSpomoveFlowFeature[];
};

export type TeacherSpomoveWeek = {
  week: number;
  label: string;
  summary: string;
  programs: TeacherSpomoveProgram[];
};

const FLOW_DURATION_SEC = 25;
const REACT_TRAIN_DURATION_SEC = 75;
const STANDARD_SPEED = 3;
const STANDARD_REPS = 20;
const STANDARD_WARMUP = 3;

function diveStageCount(flowFeatures: TeacherSpomoveFlowFeature[] | undefined): number {
  const n = flowFeatures?.length ?? 0;
  return n === 0 ? 1 : n + 1;
}

function p(
  id: string,
  title: string,
  mode: string,
  level: number,
  extra?: Pick<TeacherSpomoveProgram, 'variantColorTheme' | 'reactTrainConcurrent' | 'flowFeatures'>,
): TeacherSpomoveProgram {
  return { id, title, mode, level, ...extra };
}

export const TEACHER_SPOMOVE_WEEKS: TeacherSpomoveWeek[] = [
  {
    week: 1,
    label: '1주차',
    summary: '반응 인지 · 시지각 반응 (떨어지는 벽돌)',
    programs: [
      p('w1-rc-space', '반응 인지 · 공간 방향', 'basic', 1),
      p('w1-rc-quad', '반응 인지 · 사분할 색상', 'basic', 2, { variantColorTheme: 'color' }),
      p('w1-rc-full-color', '반응 인지 · 전면 색상 (색상)', 'basic', 3, { variantColorTheme: 'color' }),
      p('w1-vr-flow', '시지각 반응 · 떨어지는 벽돌', 'reactTrain', 1, { reactTrainConcurrent: 1 }),
    ],
  },
  {
    week: 2,
    label: '2주차',
    summary: '반응 인지 · 시지각 반응 (풍선 터뜨리기 · 두더지 잡기)',
    programs: [
      p('w2-rc-full-color', '반응 인지 · 전면 색상 (색상)', 'basic', 3, { variantColorTheme: 'color' }),
      p('w2-rc-full-animal', '반응 인지 · 전면 색상 (동물)', 'basic', 3, { variantColorTheme: 'animal' }),
      p('w2-rc-full-fruit', '반응 인지 · 전면 색상 (과일)', 'basic', 3, { variantColorTheme: 'fruit' }),
      p('w2-rc-full-vehicle', '반응 인지 · 전면 색상 (탈 것)', 'basic', 3, { variantColorTheme: 'vehicle' }),
      p('w2-vr-flash', '시지각 반응 · 풍선 터뜨리기', 'reactTrain', 2),
      p('w2-vr-mole', '시지각 반응 · 두더지 잡기', 'reactTrain', 7),
    ],
  },
  {
    week: 3,
    label: '3주차',
    summary: '반응 인지 · 다이브 (점프 → 펀치 → 숙이기 → 펀치 벽)',
    programs: [
      p('w3-rc-full-emotion', '반응 인지 · 전면 색상 (감정)', 'basic', 3, { variantColorTheme: 'emotion' }),
      p('w3-rc-full-food', '반응 인지 · 전면 색상 (음식)', 'basic', 3, { variantColorTheme: 'food' }),
      p('w3-rc-full-nature', '반응 인지 · 전면 색상 (자연물)', 'basic', 3, { variantColorTheme: 'nature' }),
      p('w3-dive-jump', '다이브 · 기본 점프', 'flow', 1, { flowFeatures: [] }),
      p('w3-dive-punch', '다이브 · 펀치', 'flow', 1, { flowFeatures: ['punch'] }),
      p('w3-dive-duck', '다이브 · 숙이기', 'flow', 1, { flowFeatures: ['duck'] }),
      p('w3-dive-reach', '다이브 · 펀치 벽', 'flow', 1, { flowFeatures: ['reach'] }),
    ],
  },
  {
    week: 4,
    label: '4주차',
    summary: '반응 인지 · 스트룹 (화살표)',
    programs: [
      p('w4-rc-2panel', '반응 인지 · 전면 2패널', 'basic', 4, { variantColorTheme: 'color' }),
      p('w4-rc-3panel-same', '반응 인지 · 전면 3패널 (같은 색)', 'basic', 5, { variantColorTheme: 'color' }),
      p('w4-rc-3panel-diff', '반응 인지 · 전면 3패널 (서로 다른 색)', 'basic', 6, { variantColorTheme: 'color' }),
      p('w4-stroop-arrow', '스트룹 · 화살표 스트룹/역스트룹', 'stroop', 1),
      p('w4-stroop-arrow-bg', '스트룹 · 화살표/배경 간섭', 'stroop', 2),
    ],
  },
  {
    week: 5,
    label: '5주차',
    summary: '반응 인지 · 스트룹 (단어)',
    programs: [
      p('w5-rc-mq1', '반응 인지 · 변형 사분할 1단계', 'basic', 7),
      p('w5-rc-mq2', '반응 인지 · 변형 사분할 2단계', 'basic', 8),
      p('w5-stroop-word', '스트룹 · 단어 스트룹/역스트룹', 'stroop', 3),
      p('w5-stroop-word-bg', '스트룹 · 단어+배경', 'stroop', 4),
    ],
  },
  {
    week: 6,
    label: '6주차',
    summary: '반응 인지 · 순차 기억 (1·2단계)',
    programs: [
      p('w6-rc-mq3', '반응 인지 · 변형 사분할 3단계', 'basic', 9),
      p('w6-rc-mq4', '반응 인지 · 변형 사분할 4단계', 'basic', 10),
      p('w6-sm-3color', '순차 기억 · 색 3개 기억', 'spatial', 1),
      p('w6-sm-5color', '순차 기억 · 색 5개 기억', 'spatial', 2),
    ],
  },
  {
    week: 7,
    label: '7주차',
    summary: '사이먼 효과 · 순차 기억 (오징어게임)',
    programs: [
      p('w7-simon-1', '사이먼 효과 · 1단계', 'simon', 1),
      p('w7-simon-2', '사이먼 효과 · 2단계', 'simon', 2),
      p('w7-sm-10color', '순차 기억 · 색 10개 기억 (오징어게임)', 'spatial', 3),
    ],
  },
  {
    week: 8,
    label: '8주차',
    summary: '플랭커 (3·4·6단계)',
    programs: [
      p('w8-flanker-3', '플랭커 · 3단계 (Random)', 'flanker', 3),
      p('w8-flanker-4', '플랭커 · 4단계 (Mixed Size & Color)', 'flanker', 4),
      p('w8-flanker-6', '플랭커 · 6단계 (5-Circle Extreme)', 'flanker', 6),
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
      speed: STANDARD_SPEED,
      timeMode: 'reps',
      targetReps: MEMORY_ROUNDS,
      variantColorTheme: program.variantColorTheme,
    };
  }

  if (program.mode === 'flow') {
    return {
      ...base,
      timeMode: 'time',
      flowFeatures: program.flowFeatures ?? [],
      flowDuration: FLOW_DURATION_SEC,
    };
  }

  if (program.mode === 'reactTrain') {
    return {
      ...base,
      speed: STANDARD_SPEED,
      timeMode: 'time',
      duration: REACT_TRAIN_DURATION_SEC,
      reactTrainConcurrent: program.reactTrainConcurrent ?? 1,
    };
  }

  return {
    ...base,
    speed: STANDARD_SPEED,
    timeMode: 'reps',
    targetReps: STANDARD_REPS,
    variantColorTheme: program.variantColorTheme,
  };
}

export function getProgramSettingChips(program: TeacherSpomoveProgram): string[] {
  if (program.mode === 'spatial') {
    return ['3초', `${MEMORY_ROUNDS}라운드`, 'BGM 자동'];
  }

  if (program.mode === 'flow') {
    const stages = diveStageCount(program.flowFeatures);
    return [`${stages}스테이지`, '스테이지 25초', 'BGM 자동'];
  }

  if (program.mode === 'reactTrain') {
    return ['3초', '약 75초', 'BGM 자동'];
  }

  return ['3초', `${STANDARD_REPS}회`, 'BGM 자동'];
}
