import type { ContactType } from './content';
import { SPOKEDU_BASE_PATH } from './site';
import { brandContactLinks } from './brand';
import { contactPage, type ContactInquiryType } from './site';

export type InquiryType = ContactInquiryType;
export type ContactTrackType =
  | 'cta-private-contact'
  | 'cta-dispatch-contact'
  | 'cta-curriculum-contact'
  | 'cta-phone'
  | 'cta-email';

export const contactTypeOptions = contactPage.inquiryTypes.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  selectTrackLabel: item.selectTrackLabel,
  submitTrackLabel: item.submitTrackLabel,
  successMessage: item.successMessage,
}));

export const contactTypes: ContactType[] = [
  {
    title: '개인·소그룹 수업 문의',
    description: contactPage.inquiryTypes[0].description,
    requiredFields: ['이름', '연락처', '이메일', '문의 내용', '아이 연령', '운동 경험', '현재 고민', '희망 수업 형태', '희망 장소', '희망 요일/시간'],
    cta: '개인수업 문의',
    href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
  },
  {
    title: '기관 파견 수업 문의',
    description: contactPage.inquiryTypes[1].description,
    requiredFields: ['이름', '연락처', '이메일', '문의 내용', '기관명', '기관 유형', '대상 연령', '예상 참여 인원', '사용 가능한 공간', '희망 일정', '희망 프로그램'],
    cta: '기관수업 제안',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
  },
  {
    title: '커리큘럼·콘텐츠 문의',
    description: contactPage.inquiryTypes[2].description,
    requiredFields: ['이름', '연락처', '이메일', '문의 내용', '기관명 또는 소속', '필요한 콘텐츠 유형', '대상 연령', '활용 목적', '강사 교육 필요 여부', '제휴 또는 구매 형태'],
    cta: '커리큘럼 문의',
    href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
  },
];

export const contactActionCtas: Array<{
  label: string;
  href: string;
  track: ContactTrackType;
  type?: InquiryType;
}> = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-contact', type: 'private' },
  { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-contact', type: 'dispatch' },
  { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-contact', type: 'curriculum' },
  { label: '전화 문의', href: brandContactLinks.phone, track: 'cta-phone' },
  { label: '이메일 문의', href: brandContactLinks.email, track: 'cta-email' },
] as const;

export const contactPreparationChecklist = [
  '대상 연령/학년, 참여 인원',
  '희망 시작 시점과 요일/시간',
  '수업 장소(실내/실외, 사용 가능 공간)',
  '현재 고민 또는 운영 목표',
  '원하는 프로그램/운영 형태(정규수업, 원데이, 커리큘럼 등)',
] as const;
