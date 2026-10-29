export type HomeSection03Person = {
  readonly photo: string;
  readonly objectPosition: string;
  readonly name: string;
  readonly role: string;
  readonly credentials: readonly string[];
};

/**
 * Section 03 temporary portrait configuration.
 * Keep portrait selection and crop direction here so approved replacements only
 * require changing the asset or this image metadata, not the layout component.
 */
export const HOME_SECTION03_PEOPLE: readonly HomeSection03Person[] = [
  {
    photo: '/images/spokedu/home/people/choi-temp-crop.jpg',
    objectPosition: '50% 30%',
    name: '최지훈',
    role: 'SPOKEDU 대표',
    credentials: ['연세대학교 체육교육학과'],
  },
  {
    photo: '/images/spokedu/private/instructor-kim-yunki.jpg',
    objectPosition: '50% 30%',
    name: '김윤기',
    role: 'SPOKEDU 총괄',
    credentials: ['연세대학교 체육교육학과', '중등 2급 정교사 자격'],
  },
  {
    photo: '/images/spokedu/private/instructor-kim-gumin.jpg',
    objectPosition: '50% 30%',
    name: '김구민',
    role: 'SPOKEDU 수업팀장',
    credentials: ['강원대학교 레저스포츠학과', '생활스포츠지도사 2급(배드민턴)'],
  },
] as const;

export const HOME_SECTION03_EVIDENCE = [
  '학교·기관 체육수업 운영',
  '체육교육 프로그램 개발',
  '지도자 교육 및 현장 관리',
] as const;
