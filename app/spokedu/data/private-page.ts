import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const privatePage = {
  hero: {
    lines: ['운동을 싫어하는 아이도', '자기 속도로 움직임을', '시작할 수 있습니다'] as const,
    subtitle: '아이 성향·운동 경험·생활 리듬을 함께 확인한 뒤 1:1 또는 소그룹 수업을 제안합니다.',
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
      {
        title: '운동이 낯선 아이',
        description: '처음부터 강하게 밀지 않고, 성공 경험이 쌓이도록 난이도와 참여 방식을 천천히 맞춥니다.',
      },
      {
        title: '자기 페이스가 필요한 아이',
        description: '1:1 또는 소그룹으로 속도와 과제량을 조절해, 비교 부담 없이 자기 리듬으로 움직이게 돕습니다.',
      },
      {
        title: '생활로 연결이 필요한 아이',
        description: '수업에서 배운 움직임 습관이 학교 체육·일상 놀이에서도 이어지도록 목표를 설계합니다.',
      },
    ],
  },
  classFormat: {
    title: '1:1과 소그룹, 어떻게 다를까요?',
    items: [
      {
        title: '1:1 개인수업',
        description: '집중 관찰과 즉시 피드백이 가능해, 운동이 낯선 아이의 시작 단계에 특히 유리합니다.',
        mediaKey: 'trackPrivate' as HomeMediaKey,
      },
      {
        title: '2~4명 소그룹',
        description: '또래와 함께 규칙·협동을 경험하면서도, 각 아이 수준에 맞춘 개별 코칭을 병행합니다.',
        mediaKey: 'proofCommunity' as HomeMediaKey,
      },
      {
        title: '수업 장소·운영 방식',
        description: '스포키듀 LAB·아파트 커뮤니티·협의 공간에서 안전 동선과 교구 세팅을 포함해 운영합니다.',
        mediaKey: 'proofClass' as HomeMediaKey,
      },
    ],
    locations: ['스포키듀 LAB', '아파트·커뮤니티', '협의 가능 공간'] as const,
    deliveryModes: ['실내·실외 공간 적응형', '교구 지참·세팅', '관찰 후 회차별 조정'] as const,
  },
  quickFaqs: {
    title: '학부모가 자주 묻는 질문',
    items: [
      {
        q: '운동을 싫어하는 아이도 가능한가요?',
        a: '가능합니다. 라포 형성과 쉬운 성공 과제를 먼저 배치해 거부감을 낮추고 참여 경험부터 만듭니다.',
      },
      {
        q: '수업 장소는 어디에서 진행하나요?',
        a: 'LAB·아파트 커뮤니티·근처 공원 등 안전이 확보된 공간에서 진행하며, 공간에 맞게 수업 구성을 조정합니다.',
      },
      {
        q: '수업 후 피드백도 받을 수 있나요?',
        a: '회차별 관찰 포인트와 다음 목표를 간단히 전달해 가정에서도 이어갈 수 있도록 안내합니다.',
      },
    ],
  },
  consultFlow: {
    title: '상담 흐름',
    steps: ['연령·성향 확인', '운동 경험 파악', '1:1/소그룹 제안', '장소·시간 확정', '첫 수업 진행'] as const,
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
