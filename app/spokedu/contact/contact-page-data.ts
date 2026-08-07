import type { ContactInquiryType } from '../data/site';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';

export type ContactInquiryOption = {
  id: ContactInquiryType;
  step: string;
  title: string;
  description: string;
  ctaLabel: string;
  accent: 'violet' | 'sky' | 'cyan' | 'teal' | 'slate';
  selectTrackLabel: string;
  submitTrackLabel: string;
  /** 퍼널 audience 힌트 (이벤트 payload) */
  audienceHint: 'institution' | 'parent' | 'instructor' | 'partner' | 'other';
};

export const CONTACT_SUCCESS_MESSAGE = '문의가 정상적으로 접수되었습니다.';

export const CONTACT_API_FAILURE_MESSAGE =
  '온라인 접수가 완료되지 않았습니다. 작성하신 내용은 현재 브라우저에 임시 보관되었습니다. 다시 시도하거나 전화·이메일·카카오채널로 문의해 주세요.';

export const contactPageContent = {
  hero: {
    kicker: '문의',
    titleLines: ['문의 유형을 고르면', '맞는 상담으로 연결합니다'] as const,
    subtitle:
      '기관 체육교육, 개인·소그룹, 구독시스템, 지도자 교육, 라이선스·협업 등 목적에 맞는 유형을 선택해 주세요. 폼이 어려우면 전화·이메일·카카오로도 연락할 수 있습니다.',
  },
  inquiryTypes: [
    {
      id: 'dispatch',
      step: '01',
      title: '기관 체육교육',
      description: '학교·센터·복지관 등 기관 조건에 맞는 정규·원데이·방학 수업을 상담합니다.',
      ctaLabel: '기관 체육교육 상담하기',
      accent: 'sky',
      selectTrackLabel: 'contact-select-dispatch',
      submitTrackLabel: 'contact-submit-dispatch',
      audienceHint: 'institution',
    },
    {
      id: 'private',
      step: '02',
      title: '개인·소그룹',
      description: '아동 개인 또는 소그룹 수업의 수준·일정·장소를 상담합니다.',
      ctaLabel: '개인·소그룹 상담 시작하기',
      accent: 'violet',
      selectTrackLabel: 'contact-select-private',
      submitTrackLabel: 'contact-submit-private',
      audienceHint: 'parent',
    },
    {
      id: 'curriculum',
      step: '03',
      title: '구독시스템',
      description:
        '지도자용 구독시스템(수업 라이브러리·도구·기록) 이용·도입을 안내합니다. 지도자 교육은 문의 목적에서 선택할 수 있습니다.',
      ctaLabel: '구독시스템 문의하기',
      accent: 'teal',
      selectTrackLabel: 'contact-select-curriculum',
      submitTrackLabel: 'contact-submit-curriculum',
      audienceHint: 'instructor',
    },
    {
      id: 'spomove',
      step: '04',
      title: '지도자 교육·SPOMOVE',
      description: '지도자 세미나·SPOMOVE 도입 교육, 기관 SPOMOVE 운영을 안내합니다.',
      ctaLabel: '교육·SPOMOVE 문의하기',
      accent: 'cyan',
      selectTrackLabel: 'contact-select-spomove',
      submitTrackLabel: 'contact-submit-spomove',
      audienceHint: 'instructor',
    },
    {
      id: 'other',
      step: '05',
      title: '라이선스·협업',
      description: '프로그램 라이선싱, 파트너 운영, 기타 협업 문의를 접수합니다.',
      ctaLabel: '라이선스·협업 문의하기',
      accent: 'slate',
      selectTrackLabel: 'contact-select-other',
      submitTrackLabel: 'contact-submit-other',
      audienceHint: 'partner',
    },
  ] satisfies ContactInquiryOption[],
  sidebar: {
    title: '상담 전 확인해 주세요',
    description:
      '문의 내용을 남겨주시면 수업 목적과 운영 환경을 확인한 뒤 적합한 방향으로 안내드립니다. 협업 범위 안내는 파트너 페이지에서도 확인할 수 있습니다.',
    partnersHref: '/spokedu/partners',
    partnersLabel: '파트너·협업 안내',
  },
  expectGuide: {
    responseNote: '문의 접수 후 보통 1~2영업일 내 연락드립니다.',
    checklistTitle: '남겨주시면 빠른 안내',
    items: [
      '문의 유형 (기관 / 개인 / 구독 / 교육·협업)',
      '대상 연령·인원',
      '희망 일정·지역',
      '연락 가능한 시간',
    ] as const,
  },
  contactTracks: {
    phone: 'contact-phone-click',
    email: 'contact-email-click',
    kakao: 'contact-kakao-click',
  },
  /** brand SSOT — 추측 URL 금지 */
  kakaoChannelHref: KAKAO_CHANNEL_URL,
  formLoadFailure: {
    title: '문의 폼을 불러오지 못했습니다',
    description:
      '일시적인 오류로 문의 폼을 표시하지 못했습니다. 아래 전화·이메일·카카오채널로 직접 문의하시거나 페이지를 새로고침해 주세요.',
  },
} as const;

export const contactTypeOptions = contactPageContent.inquiryTypes;
