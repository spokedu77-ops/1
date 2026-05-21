import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const privatePage = {
  hero: {
    lines: ['운동을 싫어하는 아이도', '자기 속도로 움직임을', '시작할 수 있습니다'] as const,
    subtitle: '1:1·소그룹 맞춤 상담 후, 연령과 경험에 맞는 수업을 제안합니다.',
    mediaKey: 'trackPrivate' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '1:1 수업 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private&classType=1to1`,
      trackLabel: 'private-cta-1to1',
    },
    secondary: {
      label: '소그룹 수업 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private&classType=small-group`,
      trackLabel: 'private-cta-small-group',
    },
  },
  whoNeeds: {
    title: '이런 아이에게 필요합니다',
    items: [
      { title: '운동이 낯선 아이', description: '참여 부담을 줄이고, 작은 성공을 반복합니다.' },
      { title: '자기 페이스가 필요한 아이', description: '1:1·소그룹으로 속도와 난이도를 맞춥니다.' },
      { title: '생활으로 이어지는 변화', description: '학교·일상에도 이어지는 변화를 돕습니다.' },
    ],
  },
  classFormat: {
    title: '수업 방식',
    items: [
      {
        title: '1:1 개인수업',
        description: '아이 속도에 맞춘 맞춤 설계',
        mediaKey: 'trackPrivate' as HomeMediaKey,
      },
      {
        title: '2~4명 소그룹',
        description: '또래와 함께, 협동·자신감 병행',
        mediaKey: 'proofCommunity' as HomeMediaKey,
      },
      {
        title: '교구·활동 중심',
        description: '놀이형 활동으로 몰입 유도',
        mediaKey: 'proofClass' as HomeMediaKey,
      },
    ],
    locations: ['스포키듀 LAB', '아파트·커뮤니티', '협의 가능 공간'] as const,
  },
  consultFlow: {
    title: '상담 흐름',
    steps: ['연령·성향', '운동 경험', '수업 형태 제안', '장소·시간', '수업 시작'] as const,
  },
  finalCta: {
    title: '맞춤 수업 상담',
    description: '1:1·소그룹 중 선택해 주세요.',
    mediaKey: 'trackPrivate' as HomeMediaKey,
    primary: {
      label: '1:1 수업 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private&classType=1to1`,
      trackLabel: 'private-final-1to1',
    },
    secondary: {
      label: '소그룹 수업 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private&classType=small-group`,
      trackLabel: 'private-final-small-group',
    },
  },
} as const;
