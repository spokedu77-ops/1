import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const dispatchPage = {
  hero: {
    lines: ['기관의 공간과 인원에 맞춰', '체육교육 프로그램을', '제안합니다'] as const,
    subtitle: '정규·원데이·캠프·SPOMOVE·PAPS를 운영 조건에 맞게 조합합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '기관 수업 제안 요청',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-cta-program',
    },
    secondary: {
      label: '제안서 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch&proposal=true`,
      trackLabel: 'dispatch-cta-proposal',
    },
  },
  operationTypes: {
    title: '운영 가능 형태',
    rows: [
      { label: '정규수업', note: '주간 반복 운영' },
      { label: '원데이 행사', note: '행사 일정 맞춤' },
      { label: '방학캠프', note: '집중 시즌' },
      { label: 'SPOMOVE', note: '반응형 에듀테크' },
      { label: 'PAPS', note: '기초체력 놀이' },
    ],
    mediaKey: 'programOneday' as HomeMediaKey,
  },
  fit: {
    title: '공간·인원 맞춤',
    items: [
      { title: '공간', description: '활동실·강당·체육관 동선 설계' },
      { title: '인원', description: '소그룹~대규모, 대기 최소화' },
      { title: '목적', description: '정규·행사·체력 목표별 조합' },
    ],
  },
  examples: {
    title: '실제 운영 사례',
    href: `${SPOKEDU_BASE_PATH}/cases`,
    trackLabel: 'dispatch-cases',
    items: [
      { title: '양천 SPOMOVE', mediaKey: 'proofClass' as HomeMediaKey },
      { title: '동작 리듬챌린지', mediaKey: 'proofCenter' as HomeMediaKey },
      { title: '다사랑 원데이', mediaKey: 'proofCommunity' as HomeMediaKey },
    ],
    institutions: ['키움센터', '지역아동센터', '학교·방과후', '키즈 복합'] as const,
  },
  finalCta: {
    title: '기관 운영에 맞는 제안서를 받아보세요',
    description: '대상·공간·인원·일정을 알려주시면 맞춤 제안을 준비합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
    primary: {
      label: '기관 수업 제안 요청',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-final-program',
    },
    secondary: {
      label: '제안서 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch&proposal=true`,
      trackLabel: 'dispatch-final-proposal',
    },
  },
} as const;
