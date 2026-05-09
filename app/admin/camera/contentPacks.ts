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
    goal: '시선 집중과 빠른 반응',
    description: '수업 초반에 몸과 시선을 빠르게 깨우는 짧은 워밍업입니다.',
    mode: 'speed',
    participantMode: 'multi',
    settings: { diff: 'easy', dur: 20, multiOn: true },
    focus: ['시선 집중', '빠른 터치', '수업 몰입'],
  },
  {
    id: 'sequence-follow-mixed',
    label: '순서 따라가기',
    ageBand: 'mixed',
    goal: '순서 인식과 실행',
    description: '화면에 보이는 번호를 1번부터 차례대로 터치하는 시각-운동 활동입니다.',
    mode: 'sequence',
    participantMode: 'solo',
    settings: { diff: 'normal', dur: 30, multiOn: false },
    focus: ['순서 인식', '침착한 실행', '시각 탐색'],
  },
  {
    id: 'attention-shape-preschool',
    label: '쉐이프 헌터',
    ageBand: 'preschool',
    goal: '선택 주의와 판단',
    description: '미션에 나온 모양만 찾아 터치하며 충동 조절과 판단을 연습합니다.',
    mode: 'shape',
    participantMode: 'multi',
    settings: { diff: 'easy', dur: 30, multiOn: true },
    focus: ['모양 변별', '충동 조절', '기초 집중'],
  },
];

export function getContentPackById(id: string): CameraContentPack | undefined {
  return CAMERA_CONTENT_PACKS.find((pack) => pack.id === id);
}
