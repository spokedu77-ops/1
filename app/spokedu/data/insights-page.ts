import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const insightsPage = {
  hero: {
    kicker: '체육교육 관점',
    lines: ['움직임을 교육으로 바라보는', '스포키듀의 관점을 정리합니다'] as const,
    subtitle:
      '현장 수업에서 관찰한 아이들의 움직임, 참여, 반응을 바탕으로 체육교육의 방향과 수업 설계 기준을 정리합니다.',
    mediaKey: 'proofClass' as HomeMediaKey,
  },
  definition: {
    title: '스포키듀 인사이트란',
    body: '스포키듀 인사이트는 현장 수업에서 관찰한 아이들의 움직임, 참여, 반응을 바탕으로 체육교육의 방향과 수업 설계 기준을 정리한 글입니다. 학부모, 기관 담당자, 강사가 함께 읽을 수 있습니다.',
  },
  roleCompare: {
    title: '현장 기록·사례·월간 수업과의 차이',
    recordsLead: '어디서, 누구에게, 어떤 수업을 했는지 보여주는 현장 활동 기록입니다.',
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
    recordsLinkLabel: '현장 기록',
    casesLead: '기관 상황에 맞춰 어떻게 수업을 구성하고 운영했는지 보여주는 협업 사례입니다.',
    casesHref: `${SPOKEDU_BASE_PATH}/cases`,
    casesLinkLabel: '운영 사례',
    monthlyLead: '월별 테마로 수업 흐름을 구성하는 월간형 체육 커리큘럼 운영 방식입니다.',
    monthlyHref: `${SPOKEDU_BASE_PATH}/monthly`,
    monthlyLinkLabel: '월간 수업',
    insightsLead:
      '현장 수업에서 얻은 교육적 관점과 수업 설계 기준 — 왜 그렇게 수업을 구성하는지 설명합니다.',
  },
  articlesSectionTitle: '교육 관점 글',
  cta: {
    title: '스포키듀의 관점이 담긴 수업을 운영하고 싶다면',
    description:
      '대상 연령, 공간, 수업 목적을 확인한 뒤 아이들에게 맞는 움직임 경험을 제안드립니다.',
    label: '스포키듀 수업 상담하기',
    href: `${SPOKEDU_BASE_PATH}/contact`,
    trackLabel: 'insights-contact-cta',
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
} as const;
