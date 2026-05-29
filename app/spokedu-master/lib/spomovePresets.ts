import type { SpomoveLaunchPreset } from '../types';

export const USER_SPOMOVE_PRESETS_KEY = 'spokedu_master_spomove_presets_v1';

export const SUPPORTED_MASTER_ENGINE_MODES = [
  'reactTrain',
  'flow',
  'flash',
  'pattern',
  'diagonal',
  'memory',
  'spatial',
] as const;

export function isSupportedMasterEngineMode(mode: string | null | undefined) {
  return Boolean(mode && SUPPORTED_MASTER_ENGINE_MODES.includes(mode as (typeof SUPPORTED_MASTER_ENGINE_MODES)[number]));
}

export function formatSpomovePresetDuration(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return '';
  if (sec < 60) return `${Math.round(sec)}초`;
  const minutes = Math.floor(sec / 60);
  const rest = Math.round(sec % 60);
  return rest ? `${minutes}분 ${rest}초` : `${minutes}분`;
}

export const OFFICIAL_SPOMOVE_PRESETS: SpomoveLaunchPreset[] = [
  {
    id: 'warmup-visual-60',
    title: '수업 도입 60초 반응 깨우기',
    subtitle: 'TV에 띄우고 전원이 바로 반응하는 짧은 도입 세팅',
    intent: 'warmup',
    drillId: 'reactTrain',
    engineMode: 'reactTrain',
    engineLevel: 1,
    durationSec: 60,
    speedSec: 1.4,
    mode: 'projector',
    tags: ['도입', '60초', '전학년'],
    target: '전학년',
    space: '실내 가능',
    useCase: '수업 시작 전에 시선과 몸을 한 번에 모을 때',
  },
  {
    id: 'focus-reset-flash-45',
    title: '집중 리셋 45초',
    subtitle: '산만해진 분위기를 빠르게 정리하는 짧은 화면 활동',
    intent: 'focus',
    drillId: 'reactTrain',
    engineMode: 'reactTrain',
    engineLevel: 2,
    durationSec: 45,
    speedSec: 1.2,
    mode: 'projector',
    tags: ['집중', '45초', '빠른 전환'],
    target: '초등 저학년 이상',
    space: '좁은 공간 가능',
    useCase: '대기 시간이 길어지거나 설명 전 집중을 다시 묶을 때',
  },
  {
    id: 'small-space-diagonal-75',
    title: '좁은 공간 방향 전환',
    subtitle: '많이 뛰지 않고도 방향 판단과 반응을 만드는 세팅',
    intent: 'space',
    drillId: 'reactTrain',
    engineMode: 'diagonal',
    engineLevel: 4,
    durationSec: 75,
    speedSec: 2.2,
    mode: 'projector',
    tags: ['좁은 공간', '방향 전환', '75초'],
    target: '초등 전학년',
    space: '교실/도장 가능',
    useCase: '공간이 좁거나 이동량을 낮춰야 하는 날',
  },
  {
    id: 'finish-memory-90',
    title: '마무리 순서 기억 챌린지',
    subtitle: '수업 끝에 차분하게 기억과 집중을 확인하는 세팅',
    intent: 'finish',
    drillId: 'spatial',
    engineMode: 'spatial',
    engineLevel: 2,
    durationSec: 90,
    speedSec: 1.3,
    mode: 'projector',
    tags: ['마무리', '기억', '집중'],
    target: '초등 저학년 이상',
    space: '실내 가능',
    useCase: '격한 활동 후 분위기를 정리하며 끝낼 때',
  },
];

export function spomovePresetHref(preset: SpomoveLaunchPreset) {
  const params = new URLSearchParams({
    drill: preset.drillId,
    mode: preset.mode,
    preset: preset.id,
    engineMode: preset.engineMode,
    level: String(preset.engineLevel),
    duration: String(preset.durationSec),
    speed: String(preset.speedSec),
  });
  return `/spokedu-master/spomove/session?${params.toString()}`;
}
