import { SPOKEDU_BASE_PATH, spokeduImageManifest } from './content';
import { cases } from './cases';

export type MonthlyRecordLink = {
  label: string;
  href: string;
};

export type MonthlyRecordImage = {
  src: string;
  alt: string;
  title: string;
};

export type MonthlyRecord = {
  slug: string;
  month: string;
  title: string;
  institutions: string[];
  programs: string[];
  movementPoints: string[];
  educationPoints: string[];
  images: MonthlyRecordImage[];
  relatedCases: MonthlyRecordLink[];
  nextInquiryCta: MonthlyRecordLink;
};

export const monthlyRecords: MonthlyRecord[] = [
  {
    slug: '2026-05',
    month: '2026-05',
    title: '2026년 5월 월간 스포키듀',
    institutions: ['양천거점형키움센터', '동작거점형키움센터', '다사랑영등포지역아동센터'],
    programs: ['SPOMOVE', '리듬챌린지', '원데이 체육행사'],
    movementPoints: ['반응속도 훈련', '리듬 기반 협응', '팀 미션 협동 활동'],
    educationPoints: ['혼합 연령 그룹 동선 분리', '강사 피드백 루프 표준화', '기관별 참여도 체크리스트 적용'],
    images: [
      {
        src: spokeduImageManifest.monthly.hero,
        alt: '2026년 5월 월간 스포키듀 대표 수업 사진',
        title: '5월 대표 수업 장면',
      },
      {
        src: spokeduImageManifest.records.yangcheon,
        alt: '양천거점형키움센터 SPOMOVE 운영 장면',
        title: '양천거점형키움센터 SPOMOVE',
      },
    ],
    relatedCases: [
      { label: '수업 사례 보기', href: `${SPOKEDU_BASE_PATH}/cases` },
      ...cases
        .filter((item) => item.slug === 'yangcheon-spomove' || item.slug === 'dongjak-rhythm')
        .map((item) => ({ label: item.title, href: item.href })),
    ],
    nextInquiryCta: { label: '다음 달 운영 문의하기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch` },
  },
  {
    slug: '2026-04',
    month: '2026-04',
    title: '2026년 4월 월간 스포키듀',
    institutions: ['PLAYZ Lounge', '서대문형무소 어린이행사 운영팀'],
    programs: ['방학캠프', '체험형 원데이 프로그램', '뉴스포츠 협동 활동'],
    movementPoints: ['기초 민첩성', '공간 인지 기반 방향전환', '협동 규칙 수행'],
    educationPoints: ['행사형 수업 운영 매뉴얼 개선', '인원 밀집 구간 안전 체크 강화', '프로그램별 난이도 안내 문구 통일'],
    images: [
      {
        src: spokeduImageManifest.records.playz,
        alt: 'PLAYZ Lounge 방학캠프 활동 장면',
        title: 'PLAYZ Lounge 방학캠프',
      },
      {
        src: spokeduImageManifest.records.seodaemun,
        alt: '서대문형무소 어린이날 체험 부스 운영 장면',
        title: '서대문형무소 체험 부스',
      },
    ],
    relatedCases: [
      { label: '수업 사례 보기', href: `${SPOKEDU_BASE_PATH}/cases` },
      ...cases
        .filter((item) => item.slug === 'playz-camp' || item.slug === 'seodaemun-event-booth')
        .map((item) => ({ label: item.title, href: item.href })),
    ],
    nextInquiryCta: { label: '행사형 수업 문의하기', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch` },
  },
  {
    slug: '2026-03',
    month: '2026-03',
    title: '2026년 3월 월간 스포키듀',
    institutions: ['스포키듀 LAB', '지역 연계 체육교육 파트너 기관'],
    programs: ['놀이체육 정규수업', 'PAPS 연계 활동', '강사 교육 세션'],
    movementPoints: ['기본 움직임 루틴', '점프·밸런스·협응', '관찰-판단-반응 시퀀스'],
    educationPoints: ['수업안 문서 구조 표준화', '교구 세팅 체크리스트 도입', '강사 교육 피드백 기록 체계화'],
    images: [
      {
        src: spokeduImageManifest.curriculum.instructorTraining,
        alt: '강사 교육 세션 운영 장면',
        title: '강사 교육 세션',
      },
      {
        src: spokeduImageManifest.curriculum.lessonPlan,
        alt: '수업안 및 커리큘럼 문서 정리 장면',
        title: '수업안 및 커리큘럼',
      },
    ],
    relatedCases: [{ label: '수업 사례 보기', href: `${SPOKEDU_BASE_PATH}/cases` }],
    nextInquiryCta: { label: '커리큘럼 문의하기', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum` },
  },
];

export function getMonthlyRecordBySlug(slug: string): MonthlyRecord | undefined {
  return monthlyRecords.find((record) => record.slug === slug);
}
