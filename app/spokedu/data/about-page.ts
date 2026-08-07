import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

/**
 * About 허브 — 영업 랜딩이 아니라 조직·관계·경로 설명.
 * 최대 6섹션. 미검증 수치·가격표 금지.
 */
export const aboutPage = {
  sectionOrder: [
    'intro',
    'origin',
    'whatWeDo',
    'principles',
    'history',
    'nextPaths',
  ] as const,

  intro: {
    id: 'intro',
    eyebrow: 'SPOKEDU',
    title: '현장 체육교육에서 시작해 콘텐츠와 시스템으로 확장하는 SPOKEDU',
    lead:
      '스포키듀는 아동·청소년 체육교육을 직접 설계·운영하는 브랜드입니다. 현장 수업을 바탕으로 SPOMOVE 콘텐츠와 지도자용 구독시스템을 확장합니다.',
    mediaKey: 'homeHero' as HomeMediaKey,
  },

  origin: {
    id: 'origin',
    eyebrow: '시작',
    title: '현장에서 시작한 구조',
    lead: '개인·기관 수업을 운영하며 정리한 활동 기준이 프로그램·콘텐츠·도구로 이어졌습니다.',
    steps: [
      {
        title: '현장 수업',
        body: '학교·키움·복지·개인 수업에서 대상과 공간에 맞춰 활동을 설계·진행합니다.',
      },
      {
        title: '콘텐츠화',
        body: '반복되는 수업 흐름을 SPOMOVE 등 콘텐츠와 수업 자료로 정리합니다.',
      },
      {
        title: '시스템',
        body: '지도자가 찾고·준비하고·진행·기록하는 흐름을 구독시스템으로 연결합니다.',
      },
    ] as const,
  },

  whatWeDo: {
    id: 'what-we-do',
    eyebrow: '현재',
    title: '현재 하는 일',
    lead: '세 축은 동등한 판매 실적 카드가 아니라, 서로 다른 역할의 관계입니다.',
    items: [
      {
        id: 'education',
        role: '직접 운영',
        title: '체육교육',
        body: '기관수업과 개인·소그룹을 스포키듀가 직접 설계·운영합니다.',
        href: `${SPOKEDU_BASE_PATH}/education`,
        ctaLabel: '체육교육 알아보기',
        trackLabel: 'about-what-education',
      },
      {
        id: 'spomove',
        role: '콘텐츠',
        title: 'SPOMOVE',
        body: '체육교육 현장과 구독시스템 양쪽에서 활용하는 화면 신호 기반 활동 콘텐츠입니다.',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        ctaLabel: 'SPOMOVE 알아보기',
        trackLabel: 'about-what-spomove',
      },
      {
        id: 'subscription',
        role: '지도자용 제품',
        title: '구독시스템',
        body: '수업을 찾고 준비하고 진행·기록하는 흐름을 돕는 지도자용 제품입니다.',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        ctaLabel: '구독시스템 알아보기',
        trackLabel: 'about-what-curriculum',
      },
    ] as const,
  },

  principles: {
    id: 'principles',
    eyebrow: '원칙',
    title: '운영 원칙',
    items: [
      {
        title: '현장 조건 우선',
        body: '공간·인원·연령·일정에 맞춰 난이도와 동선을 조정합니다.',
      },
      {
        title: '과정 중심 설명',
        body: '효과·발달을 보장하지 않고, 제시·판단·수행·조절의 과정을 설명합니다.',
      },
      {
        title: '공개 근거만',
        body: '사례·연혁·제품 안내는 확인된 기록과 공개 계약 범위 안에서만 표기합니다.',
      },
    ] as const,
  },

  /** 압축 연혁 — about-history 핵심만. SNS 팔로워·미검증 누적 수치 제외 */
  history: {
    id: 'history',
    eyebrow: '연혁',
    title: '주요 연혁',
    lead: '설립부터 현재까지, 공개 가능한 핵심 사건만 압축했습니다.',
    milestones: [
      { date: '2020. 06', text: '스포키듀 설립 및 출강 시작' },
      { date: '2023. 02', text: 'KBS 「슈퍼맨이 돌아왔다」 체력 측정 자문 출연' },
      { date: '2023. 10~12', text: '서초여성가족플라자 아동체육 인큐베이팅 강의' },
      { date: '2025. 02', text: '거점형 키움센터 연간 체육 프로그램 계약' },
      { date: '2025. 03', text: '이마트 문화센터 미니올림픽 특강(서울·경기·대전)' },
      { date: '2025~', text: 'SPOMOVE 현장 적용 · 구독시스템(MASTER) 운영' },
      { date: '2026. 05', text: '서대문구 어린이날 기념 아동청소년축제 부스 운영' },
      { date: '2026. 07. 16', text: '광주광역시 체육 지도자 교육 세미나' },
    ] as const,
  },

  team: {
    id: 'team',
    eyebrow: '운영',
    title: '운영 대표',
    name: '최지훈',
    role: '스포키듀 운영 대표',
    notes: [
      '연세대학교 체육교육학과 졸업',
      '현장 수업·기관 운영·지도자 교육을 함께 담당',
    ] as const,
    note: '학력·경력은 신뢰 보조 자료이며, 페이지의 핵심 메시지는 현장 운영과 제품 관계입니다.',
  },

  nextPaths: {
    id: 'next',
    eyebrow: '다음 경로',
    title: '목적에 맞는 경로로 이어가세요',
    lead: 'About은 소개 페이지입니다. 상담·도입은 각 경로에서 이어집니다.',
    items: [
      {
        label: '체육교육',
        href: `${SPOKEDU_BASE_PATH}/education`,
        trackLabel: 'about-next-education',
      },
      {
        label: 'SPOMOVE',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'about-next-spomove',
      },
      {
        label: '구독시스템',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'about-next-curriculum',
      },
      {
        label: '문의·협업',
        href: `${SPOKEDU_BASE_PATH}/contact`,
        trackLabel: 'about-next-contact',
      },
    ] as const,
    secondary: [
      {
        label: 'SPOMAT 알아보기',
        href: `${SPOKEDU_BASE_PATH}/spomat`,
        trackLabel: 'about-next-spomat',
      },
      {
        label: '파트너·협업 안내',
        href: `${SPOKEDU_BASE_PATH}/partners`,
        trackLabel: 'about-next-partners',
      },
    ] as const,
  },
} as const;
