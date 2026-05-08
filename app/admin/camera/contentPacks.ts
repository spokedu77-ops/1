import type { CameraModeId } from './constants';
import type { CameraParticipantMode, CameraSettings } from './types';

export type CameraClassAgeBand = 'preschool' | 'lowerElementary' | 'upperElementary' | 'mixed';

export interface CameraContentPack {
  id: string;
  label: string;
  ageBand: CameraClassAgeBand;
  goal: string;
  description: string;
  mode: CameraModeId;
  participantMode: CameraParticipantMode;
  settings: Pick<CameraSettings, 'diff' | 'dur' | 'multiOn'>;
  focus: string[];
}

export const AGE_BAND_LABELS: Record<CameraClassAgeBand, string> = {
  preschool: '유아',
  lowerElementary: '초등 저학년',
  upperElementary: '초등 고학년',
  mixed: '혼합반',
};

export const CAMERA_CONTENT_PACKS: CameraContentPack[] = [
  {
    id: 'reaction-warmup-lower',
    label: '반응 깨우기',
    ageBand: 'lowerElementary',
    goal: '순발력 워밍업',
    description: '수업 초반에 몸과 시선을 빠르게 깨우는 짧은 활동입니다.',
    mode: 'speed',
    participantMode: 'multi',
    settings: { diff: 'easy', dur: 20, multiOn: true },
    focus: ['시선 집중', '빠른 터치', '수업 몰입'],
  },
  {
    id: 'memory-sequence-mixed',
    label: '순서 기억 챌린지',
    ageBand: 'mixed',
    goal: '기억력과 실행 순서',
    description: '번호 순서를 보고 기억한 뒤 몸으로 실행하는 인지-운동 활동입니다.',
    mode: 'sequence',
    participantMode: 'solo',
    settings: { diff: 'normal', dur: 30, multiOn: false },
    focus: ['작업 기억', '순서 실행', '침착한 반응'],
  },
  {
    id: 'attention-shape-preschool',
    label: '모양 찾기',
    ageBand: 'preschool',
    goal: '주의 집중과 변별',
    description: '지시된 모양만 찾아 터치하며 충동 조절을 연습합니다.',
    mode: 'shape',
    participantMode: 'multi',
    settings: { diff: 'easy', dur: 30, multiOn: true },
    focus: ['모양 변별', '충동 조절', '기초 집중'],
  },
  {
    id: 'agility-moving-upper',
    label: '무빙 캐치',
    ageBand: 'upperElementary',
    goal: '민첩성과 추적 반응',
    description: '움직이는 목표를 끝까지 보고 따라가며 전신 반응을 끌어올립니다.',
    mode: 'moving',
    participantMode: 'multi',
    settings: { diff: 'hard', dur: 30, multiOn: true },
    focus: ['민첩성', '시각 추적', '방향 전환'],
  },
  {
    id: 'balance-focus-mixed',
    label: '밸런스 집중',
    ageBand: 'mixed',
    goal: '균형감각과 자세 유지',
    description: '정해진 자세를 유지하며 균형감각과 신체 인식을 확인합니다.',
    mode: 'balance',
    participantMode: 'solo',
    settings: { diff: 'normal', dur: 30, multiOn: false },
    focus: ['균형', '자세 유지', '고유수용감각'],
  },
  {
    id: 'mirror-coordination-lower',
    label: '미러 따라하기',
    ageBand: 'lowerElementary',
    goal: '동작 모방과 협응',
    description: '화면의 동작을 따라 하며 좌우 협응과 모방 학습을 진행합니다.',
    mode: 'mirror',
    participantMode: 'multi',
    settings: { diff: 'normal', dur: 30, multiOn: true },
    focus: ['모방', '좌우 협응', '리듬감'],
  },
];

export function getContentPackById(id: string): CameraContentPack | undefined {
  return CAMERA_CONTENT_PACKS.find((pack) => pack.id === id);
}
