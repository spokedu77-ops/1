import { SPOKEDU_BASE_PATH } from './content';

export type CtaItem = {
  label: string;
  href: string;
  track?: string;
};

export const firstVisitInquiryCtas: CtaItem[] = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-contact' },
  { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-contact' },
  { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-contact' },
];

export const homeThreeTrackInquiryCtas: CtaItem[] = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-track' },
  { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-track' },
  { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-track' },
];

export const privateCtas: CtaItem[] = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-final' },
  { label: '수업 일정·장소 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-schedule' },
];

export const privateHeroCtas: CtaItem[] = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-hero' },
  { label: '개인수업 운영 방식 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-hero-ops' },
];

export const dispatchCtas: CtaItem[] = [
  { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-final' },
  { label: '운영 조건 공유하고 제안받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-ops' },
];

export const dispatchHeroCtas: CtaItem[] = [
  { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-hero' },
  { label: '제안서 상담 시작하기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-hero-proposal' },
];

export const curriculumCtas: CtaItem[] = [
  { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-final' },
  { label: '도입 범위 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-scope' },
];

export const curriculumHeroCtas: CtaItem[] = [
  { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-hero' },
  { label: '제휴·라이선스 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-hero-license' },
];

export const recordsHubCtas: CtaItem[] = [
  { label: '수업 사례 보기', href: `${SPOKEDU_BASE_PATH}/cases`, track: 'cta-records-cases' },
  { label: '월간 스포키듀 보기', href: `${SPOKEDU_BASE_PATH}/monthly`, track: 'cta-records-monthly' },
  { label: '교육 인사이트 보기', href: `${SPOKEDU_BASE_PATH}/insights`, track: 'cta-records-insights' },
];

export const programsHubCtas: CtaItem[] = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-programs' },
  { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-programs' },
  { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-programs' },
];

export const homeInquiryCtas: CtaItem[] = [
  ...firstVisitInquiryCtas,
];

export const homeHeroTrackCtas: CtaItem[] = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-hero' },
  { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-hero' },
  { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-hero' },
];

export const recordsBottomInquiryCtas: CtaItem[] = [
  { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private`, track: 'cta-private-records' },
  { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`, track: 'cta-dispatch-records' },
  { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`, track: 'cta-curriculum-records' },
];
