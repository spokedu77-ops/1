import type { DiveActiveThemeId } from '@/app/lib/spomove/diveThemes';
import { FLOW_MODULES, type FlowModule, type FlowModuleKey } from './flowModules';

export type DiveThemePresentation = Pick<FlowModule,
  'label' | 'icon' | 'cueWord' | 'shortInstruction' | 'description' | 'tag' | 'color' | 'colorBg' | 'colorBorder'>;
type Copy = Pick<DiveThemePresentation, 'label' | 'icon' | 'shortInstruction' | 'description'>;

const OBSTACLE_COPY: Record<DiveActiveThemeId, Record<'punch' | 'duck' | 'kick' | 'reach', Copy>> = {
  space: {
    punch: { label: '에너지 상자 펀치', icon: '👊', shortInstruction: '에너지 상자가 나타나면\n주먹으로 타격하세요', description: '허리~가슴 높이의 에너지 상자를 정면 주먹으로 타격합니다.' },
    duck: { label: '우주선 숙이기', icon: '🛸', shortInstruction: '우주선이 다가오면\n몸을 낮춰 피하세요', description: '다가오는 우주선을 몸을 낮춰 피합니다.' },
    kick: { label: '에너지통 킥', icon: '🦵', shortInstruction: '에너지통이 다가오면\n발로 차세요', description: '낮게 다가오는 에너지통을 앞으로 가볍게 찹니다.' },
    reach: { label: '우주 방벽 두드리기', icon: '⭐', shortInstruction: '우주 방벽을 5번 두드려\n부수세요', description: '별 타깃이 있는 우주 방벽을 5번 연속 두드려 부숩니다.' },
  },
  ocean: {
    punch: { label: '보물상자 펀치', icon: '👊', shortInstruction: '보물상자가 나타나면\n주먹으로 타격하세요', description: '허리~가슴 높이의 보물상자를 정면 주먹으로 타격합니다.' },
    duck: { label: '상어 · DUCK', icon: '🦈', shortInstruction: '상어가 다가오면 몸을 낮춰 피하세요', description: '상어가 다가오면 몸을 낮춰 피하세요' },
    kick: { label: '나무통 킥', icon: '🦵', shortInstruction: '나무통이 다가오면\n발로 차세요', description: '낮게 다가오는 나무통을 앞으로 가볍게 찹니다.' },
    reach: { label: '금고문 두드리기', icon: '🚪', shortInstruction: '금고문을 5번 두드려\n부수세요', description: '앞을 막는 금고문을 5번 연속 두드려 부숩니다.' },
  },
};

/** Presentation only: module keys, timing, movement and obstacle semantics stay in FLOW_MODULES. */
export function resolveDiveThemePresentation(theme: DiveActiveThemeId, key: FlowModuleKey | 'bonus'): DiveThemePresentation {
  if (key === 'bonus') return {
    ...FLOW_MODULES.jump, label: 'BONUS', tag: 'BONUS', icon: '🏆', cueWord: '보너스!',
    color: '#fbbf24', colorBg: 'rgba(251,191,36,0.15)', colorBorder: 'rgba(251,191,36,0.6)',
    shortInstruction: '지금까지 배운\n모든 동작을 수행하세요', description: '지금까지 배운 모든 동작을 수행합니다.',
  };
  const base = FLOW_MODULES[key];
  if (key === 'jump') return { ...base, shortInstruction: '발판이 다가오면\n타이밍에 맞춰 점프하세요' };
  if (key === 'faster') return { ...base, shortInstruction: '속도가 빨라집니다\n리듬에 맞춰 움직이세요' };
  if (key === 'colorGate') return base;
  return { ...base, ...OBSTACLE_COPY[theme][key] };
}

export function resolveDiveStagePresentation(theme: DiveActiveThemeId,
  stage: { isColorGate?: boolean; isBonus: boolean; newModule: FlowModuleKey; label: string }): DiveThemePresentation {
  const presentation = resolveDiveThemePresentation(theme, stage.isColorGate ? 'colorGate' : stage.isBonus ? 'bonus' : stage.newModule);
  return stage.label === 'RANDOM' ? { ...presentation, label: '랜덤 동작', cueWord: '랜덤!' } : presentation;
}
