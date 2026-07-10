import type { MemoryGameAutoLaunch } from '@/app/admin/spomove/training/_player/MemoryGameApp';
import { MEMORY_ROUNDS } from '@/app/admin/spomove/training/_player/constants';
import type { SpomoveColorThemeId } from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';

export type TeacherSpomoveProgram = {
  id: string;
  title: string;
  mode: string;
  level: number;
  speed?: number;
  targetReps?: number;
  duration?: number;
  variantColorTheme?: SpomoveColorThemeId;
  reactTrainConcurrent?: 1 | 2 | 3;
  bodyLabelMode?: 'easy' | 'hard';
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

export const TEACHER_SPOMOVE_WEEKS: TeacherSpomoveWeek[] = [
  {
    week: 1,
    label: '1주차',
    summary: '반응인지와 스트룹으로 방향, 색상, 간섭 반응을 시작합니다.',
    programs: [
      basic('w1-rc-space', '반응인지 - 공간 방향', 1, 2),
      basic('w1-rc-quad-color', '반응인지 - 사분할 색상', 2, 2, 'color'),
      basic('w1-rc-full-color', '반응인지 - 전면색상: 색상', 3, 2, 'color'),
      stroop('w1-stroop-arrow', '스트룹 - 공간 방향 · 색상', 1),
      stroop('w1-stroop-arrow-bg', '스트룹 - 화살표/배경 간섭', 2),
    ],
  },
  {
    week: 2,
    label: '2주차',
    summary: '전면색상 테마와 시지각 반응 게임으로 반응 폭을 넓힙니다.',
    programs: [
      basic('w2-rc-full-animal', '반응인지 - 전면색상: 동물', 3, 2, 'animal'),
      basic('w2-rc-full-fruit', '반응인지 - 전면색상: 과일', 3, 2, 'fruit'),
      basic('w2-rc-full-food', '반응인지 - 전면색상: 음식', 3, 2, 'food'),
      reactTrain('w2-vr-balloon', '시지각 반응 - 풍선 터뜨리기 1개', 2, 2, 30),
      reactTrain('w2-vr-bricks', '시지각 반응 - 떨어지는 벽돌 2개', 1, 2.5, 60, {
        reactTrainConcurrent: 2,
      }),
    ],
  },
  {
    week: 3,
    label: '3주차',
    summary: '변형 사분할과 단어 스트룹으로 간섭 반응을 확장합니다.',
    programs: [
      basic('w3-rc-mod-quad-1', '반응인지 - 변형 사분할 1단계', 7, 2),
      basic('w3-rc-mod-quad-2', '반응인지 - 변형 사분할 2단계', 8, 4),
      stroop('w3-stroop-word', '스트룹 - 단어 스트룹/역스트룹', 3),
      stroop('w3-stroop-word-bg', '스트룹 - 단어+배경', 4),
    ],
  },
  {
    week: 4,
    label: '4주차',
    summary: '새 전면색상 테마와 두더지 반응으로 선택 반응을 확장합니다.',
    programs: [
      basic('w4-rc-full-vehicle', '반응인지 - 전면색상: 탈 것', 3, 2, 'vehicle'),
      basic('w4-rc-full-nature', '반응인지 - 전면색상: 자연물', 3, 2, 'nature'),
      basic('w4-rc-full-emotion', '반응인지 - 전면색상: 감정', 3, 2, 'emotion'),
      reactTrain('w4-vr-mole', '시지각 반응 - 두더지 잡기', 7, 2, 30),
    ],
  },
  {
    week: 5,
    label: '5주차',
    summary: '2패널과 3패널 반응인지로 선택 폭을 넓힙니다.',
    programs: [
      basic('w5-rc-2panel-animal', '반응인지 - 2패널: 동물', 4, 3, 'animal'),
      basic('w5-rc-2panel-fruit', '반응인지 - 2패널: 과일', 4, 3, 'fruit'),
      basic('w5-rc-2panel-food', '반응인지 - 2패널: 음식', 4, 3, 'food'),
      basic('w5-rc-3panel-vehicle', '반응인지 - 3패널: 탈 것', 6, 3, 'vehicle'),
      basic('w5-rc-3panel-nature', '반응인지 - 3패널: 자연물', 6, 3, 'nature'),
      basic('w5-rc-3panel-emotion', '반응인지 - 3패널: 감정', 6, 3, 'emotion'),
    ],
  },
  {
    week: 6,
    label: '6주차',
    summary: '변형 사분할 3,4단계와 카모플라쥬 밸런스 무빙을 진행합니다.',
    programs: [
      p('w6-rc-mod-quad-3-easy', '반응인지 - 변형 사분할 3단계', 'basic', 9, {
        speed: 4,
        targetReps: 15,
        bodyLabelMode: 'easy',
      }),
      p('w6-rc-mod-quad-4-easy', '반응인지 - 변형 사분할 4단계', 'basic', 10, {
        speed: 4,
        targetReps: 15,
        bodyLabelMode: 'easy',
      }),
      reactTrain('w6-vr-camouflage-balance', '시지각 반응 - 카모플라쥬: 밸런스 무빙', 4, 3, 30),
    ],
  },
  {
    week: 7,
    label: '7주차',
    summary: '사이먼 믹스 갤러리와 랜덤·크기/색 혼합 플랭커로 선택·억제 반응을 연습합니다.',
    programs: [
      p('w7-simon-effect', '사이먼 효과 - 믹스 갤러리', 'simon', 3, {
        speed: 2,
        targetReps: 15,
      }),
      p('w7-flanker-random', '플랭커 - 랜덤 플랭커', 'flanker', 3, {
        speed: 2.5,
        targetReps: 15,
      }),
      p('w7-flanker-mixed', '플랭커 - 크기/색 혼합', 'flanker', 4, {
        speed: 2.5,
        targetReps: 15,
      }),
    ],
  },
  {
    week: 8,
    label: '8주차',
    summary: '순차기억 5항·색-번호 과제로 작업기억을 마무리합니다.',
    programs: [
      p('w8-memory-5items', '순차기억 5항 기억', 'spatial', 2, {
        targetReps: 4,
        displayChips: ['1~3초 랜덤', '4라운드', 'BGM 자동'],
      }),
      p('w8-memory-color-number-quiz', '순차기억 색-번호 맞추기', 'spatial', 4, {
        speed: STANDARD_SPEED,
        targetReps: MEMORY_ROUNDS,
      }),
      p('w8-memory-color-number-full', '순차기억 색-번호 전체보기', 'spatial', 5, {
        speed: STANDARD_SPEED,
        targetReps: MEMORY_ROUNDS,
      }),
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
    programTitle: program.title,
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

  if (program.mode === 'reactTrain') {
    return {
      ...base,
      speed: program.speed ?? STANDARD_SPEED,
      timeMode: 'time',
      duration: program.duration ?? REACT_TRAIN_DURATION_SEC,
      reactTrainConcurrent: program.reactTrainConcurrent ?? 1,
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

  if (program.mode === 'reactTrain') {
    return [formatSeconds(program.speed ?? STANDARD_SPEED), `${program.duration ?? REACT_TRAIN_DURATION_SEC}초`, 'BGM 자동'];
  }

  return [formatSeconds(program.speed ?? STANDARD_SPEED), `${program.targetReps ?? STANDARD_REPS}회`, 'BGM 자동'];
}
