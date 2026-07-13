import type { ContactInquiryType } from '../data/site';

export type ContactInquiryOption = {
  id: ContactInquiryType;
  step: string;
  title: string;
  description: string;
  ctaLabel: string;
  accent: 'violet' | 'sky' | 'cyan' | 'teal' | 'slate';
  selectTrackLabel: string;
  submitTrackLabel: string;
};

export const CONTACT_SUCCESS_MESSAGE = '문의가 정상적으로 접수되었습니다.';

export const CONTACT_API_FAILURE_MESSAGE =
  '온라인 접수가 완료되지 않았습니다. 작성하신 내용은 현재 브라우저에 임시 보관되었습니다. 다시 시도하거나 전화·이메일로 문의해 주세요.';

export const contactPageContent = {
  hero: {
    kicker: '문의',
    titleLines: ['필요한 수업 방향에 맞춰', '상담을 연결합니다'] as const,
    subtitle:
      '개인·소그룹 수업, 기관 프로그램, SPOMOVE 도입, 커리큘럼·교육, 기타 협업 목적에 맞는 상담 유형을 선택해 주세요.',
  },
  inquiryTypes: [
    {
      id: 'private',
      step: '01',
      title: '개인·소그룹 수업',
      description: '아이의 운동 경험, 성향, 목표에 맞춘 1:1·소그룹 수업을 상담합니다.',
      ctaLabel: '개인수업 상담 시작하기',
      accent: 'violet',
      selectTrackLabel: 'contact-select-private',
      submitTrackLabel: 'contact-submit-private',
    },
    {
      id: 'dispatch',
      step: '02',
      title: '기관 프로그램',
      description: '기관의 공간, 인원, 일정에 맞는 정규수업·원데이·방학캠프를 제안합니다.',
      ctaLabel: '기관 프로그램 상담하기',
      accent: 'sky',
      selectTrackLabel: 'contact-select-dispatch',
      submitTrackLabel: 'contact-submit-dispatch',
    },
    {
      id: 'spomove',
      step: '03',
      title: 'SPOMOVE 도입',
      description: 'SPOMOVE 에듀테크 체육 프로그램의 기관 도입과 운영 방식을 안내합니다.',
      ctaLabel: 'SPOMOVE 도입 문의하기',
      accent: 'cyan',
      selectTrackLabel: 'contact-select-spomove',
      submitTrackLabel: 'contact-submit-spomove',
    },
    {
      id: 'curriculum',
      step: '04',
      title: '커리큘럼·지도자 교육',
      description: '수업안, 운영 매뉴얼, 지도자 교육, 프로그램 콘텐츠 협업을 안내합니다.',
      ctaLabel: '커리큘럼 문의하기',
      accent: 'teal',
      selectTrackLabel: 'contact-select-curriculum',
      submitTrackLabel: 'contact-submit-curriculum',
    },
    {
      id: 'other',
      step: '05',
      title: '기타 협업',
      description: '제휴, 행사 협업, 미디어·콘텐츠 협력 등 기타 문의를 접수합니다.',
      ctaLabel: '협업 문의하기',
      accent: 'slate',
      selectTrackLabel: 'contact-select-other',
      submitTrackLabel: 'contact-submit-other',
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
  formLoadFailure: {
    title: '문의 폼을 불러오지 못했습니다',
    description: '일시적인 오류로 문의 폼을 표시하지 못했습니다. 아래 연락처로 직접 문의하시거나 페이지를 새로고침해 주세요.',
  },
} as const;

export const contactTypeOptions = contactPageContent.inquiryTypes;
