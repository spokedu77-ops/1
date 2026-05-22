import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const papsProgramPage = {
  hero: {
    kicker: '놀이형 체력 향상 · 기초체력 경험',
    lines: ['체력평가 요소를', '놀이형 수업으로', '경험합니다'] as const,
    subtitle:
      '학교 체력평가 요소를 기반으로 아이들이 부담 없이 체력 요소를 경험하고, 자신의 움직임과 체력 상태를 이해하도록 돕는 프로그램입니다.',
    mediaKey: 'programPaps' as HomeMediaKey,
  },
  heroCta: {
    label: 'PAPS 프로그램 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-paps-dispatch-hero',
  },
  overview: {
    title: 'PAPS란',
    body: '학교 체력평가 요소를 기반으로 아이들이 부담 없이 체력 요소를 경험하고, 자신의 움직임과 체력 상태를 이해하도록 돕는 놀이형 체력 향상 프로그램입니다. 기록보다 참여, 반복, 움직임 이해가 먼저입니다.',
    emphasis: '측정·평가 대비가 아니라, 움직임으로 체력 요소를 경험하는 수업입니다.',
  },
  fitnessElements: {
    title: '경험하는 체력 요소',
    items: [
      {
        title: '심폐지구력',
        description: '오래 움직이며 호흡과 페이스를 조절하는 경험을 합니다.',
      },
      {
        title: '근지구력',
        description: '반복 동작과 버티기 활동을 통해 몸을 지속적으로 사용하는 경험을 합니다.',
      },
      {
        title: '순발력',
        description: '짧은 시간에 빠르게 반응하고 힘을 사용하는 움직임을 경험합니다.',
      },
      {
        title: '유연성',
        description: '몸을 부드럽게 움직이고 관절 가동 범위를 자연스럽게 넓혀갑니다.',
      },
      {
        title: '민첩성·협응력',
        description: '방향 전환, 균형, 리듬 움직임을 통해 상황에 맞게 몸을 조절합니다.',
      },
    ],
  },
  classFlow: {
    title: '수업 방식',
    steps: [
      {
        label: '체력 요소 이해',
        detail: '오늘 경험할 체력 요소와 움직임 목표를 쉽게 설명합니다.',
      },
      {
        label: '기초 움직임 연습',
        detail: '달리기, 점프, 버티기, 균형 등 기본 움직임을 안전하게 준비합니다.',
      },
      {
        label: '놀이형 체력 미션',
        detail: '기록 측정보다 참여와 반복 경험을 중심으로 체력 미션을 진행합니다.',
      },
      {
        label: '피드백과 다음 목표',
        detail: '아이의 참여 흐름과 움직임 변화를 확인하고 다음 수업 방향을 정리합니다.',
      },
    ] as const,
  },
  institutionFit: {
    title: '기관 도입',
    lead: '학교 체력평가 요소를 참고하되, 아이들이 부담 없이 참여할 수 있도록 구성합니다.',
    body: '놀이형 미션과 단계별 움직임으로 진행하며, 인원·공간·연령에 맞춰 체력 요소별 활동을 조정해 정규수업, 방과후, 기관 특강으로 운영할 수 있습니다.',
  },
  audience: {
    title: '대상 · 운영 형태',
    targets:
      '초등학생부터 청소년까지, 기초 체력과 움직임 경험을 점검하고 싶은 아이들에게 적합합니다.',
    operations:
      '학교·방과후·기관 정규수업, 체력 향상 특강, 방학 프로그램 안에서 운영할 수 있습니다.',
  },
  finalCta: {
    title: 'PAPS 프로그램을 기관에 맞게 운영하고 싶다면',
    description:
      '대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 체력 요소 중심의 수업 형태로 안내드립니다.',
    label: 'PAPS 프로그램 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-paps-dispatch-final',
  },
} as const;
