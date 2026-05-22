import type { ContactInquiryType } from '../data/site';

export type ContactInquiryOption = {
  id: ContactInquiryType;
  step: string;
  title: string;
  description: string;
  ctaLabel: string;
  accent: 'violet' | 'sky' | 'teal';
  selectTrackLabel: string;
  submitTrackLabel: string;
  successMessage: string;
};

export const contactPageContent = {
  hero: {
    kicker: '문의',
    titleLines: ['필요한 수업 방향에 맞춰', '상담을 연결합니다'] as const,
    subtitle:
      '아이의 운동 경험, 기관의 운영 환경, 커리큘럼 협업 목적에 맞춰 가장 적합한 문의 흐름을 선택해 주세요.',
  },
  inquiryTypes: [
    {
      id: 'private',
      step: '01',
      title: '개인수업 상담',
      description: '아이의 운동 경험, 성향, 목표에 맞춘 1:1·소그룹 수업을 상담합니다.',
      ctaLabel: '개인수업 상담 시작하기',
      accent: 'violet',
      selectTrackLabel: 'contact-select-private',
      submitTrackLabel: 'contact-submit-private',
      successMessage:
        '문의가 접수되었습니다.\n아이의 연령과 운동 경험을 확인한 뒤 수업 방향을 안내드리겠습니다.',
    },
    {
      id: 'dispatch',
      step: '02',
      title: '기관 프로그램 제안',
      description: '기관의 공간, 인원, 일정에 맞는 정규수업·원데이·방학캠프를 제안합니다.',
      ctaLabel: '기관 제안 문의하기',
      accent: 'sky',
      selectTrackLabel: 'contact-select-dispatch',
      submitTrackLabel: 'contact-submit-dispatch',
      successMessage:
        '기관 수업 문의가 접수되었습니다.\n공간, 인원, 운영 목적을 확인한 뒤 제안 방향을 안내드리겠습니다.',
    },
    {
      id: 'curriculum',
      step: '03',
      title: '커리큘럼·콘텐츠 문의',
      description: '수업안, 운영 매뉴얼, 강사교육, 프로그램 콘텐츠 협업을 안내합니다.',
      ctaLabel: '콘텐츠 문의하기',
      accent: 'teal',
      selectTrackLabel: 'contact-select-curriculum',
      submitTrackLabel: 'contact-submit-curriculum',
      successMessage:
        '커리큘럼·콘텐츠 문의가 접수되었습니다.\n필요한 콘텐츠 유형과 활용 목적을 확인한 뒤 안내드리겠습니다.',
    },
  ] satisfies ContactInquiryOption[],
  sidebar: {
    title: '상담 전 확인해 주세요',
    description:
      '문의 내용을 남겨주시면 수업 목적과 운영 환경을 확인한 뒤 적합한 방향으로 안내드립니다.',
  },
  contactTracks: {
    phone: 'contact-phone-click',
    email: 'contact-email-click',
  },
  footer: {
    tagline: '아동·청소년 체육교육 전문 운영 브랜드',
    navLabels: [
      '브랜드',
      '개인수업',
      '기관수업',
      '커리큘럼',
      '프로그램',
      '현장기록',
      '문의',
    ] as const,
  },
} as const;

export const contactTypeOptions = contactPageContent.inquiryTypes;
