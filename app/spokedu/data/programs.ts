import type { ProgramAssetItem } from './content';
import { SPOKEDU_BASE_PATH } from './content';
import { SPOKEDU_IMAGES } from './images';

export type ProgramCategory = '에듀테크' | '기초체력' | '놀이체육' | '행사형' | '캠프형' | '콘텐츠';
export type ProgramSlug =
  | 'spomove'
  | 'paps'
  | 'oneday-event'
  | 'camp'
  | 'play-class'
  | 'curriculum-content'
  | 'play-pe'
  | 'new-sports'
  | 'funstick'
  | 'curriculum-package';

export type ProgramData = {
  title: string;
  slug: ProgramSlug;
  category: ProgramCategory;
  description: string;
  connectedTracks: Array<'Private' | 'Dispatch' | 'Curriculum'>;
  effects: string[];
  target: string;
  expandable: boolean;
  detailDescription?: string;
  inquiryHref: string;
  href: string;
  image: string;
  imageAlt: string;
};

export const programCatalog: Record<ProgramSlug, ProgramData> = {
  spomove: {
    title: 'SPOMOVE',
    slug: 'spomove',
    category: '에듀테크',
    description: '보고, 선택하고, 판단하고, 움직이는 빔 기반 에듀테크 놀이체육',
    connectedTracks: ['Private', 'Dispatch', 'Curriculum'],
    effects: ['집중력', '반응속도', '타이밍', '방향전환'],
    target: '기관 단체수업, 방과후, 키움센터, 개인/소그룹 응용',
    expandable: true,
    detailDescription: '보고, 선택하고, 판단하고, 움직이는 빔 기반 에듀테크 놀이체육 프로그램입니다.',
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    image: SPOKEDU_IMAGES.programs.spomove.src,
    imageAlt: 'SPOMOVE 빔 기반 놀이체육 수업 장면',
  },
  paps: {
    title: 'PAPS 연계 놀이체육',
    slug: 'paps',
    category: '기초체력',
    description: '초등 기초체력 요소를 놀이체육으로 경험하는 프로그램',
    connectedTracks: ['Dispatch', 'Curriculum'],
    effects: ['심폐지구력', '근력', '유연성', '순발력'],
    target: '초등 저학년~고학년 기초체력 경험형 수업',
    expandable: true,
    detailDescription: '초등 기초체력 요소를 놀이체육으로 경험할 수 있도록 설계한 프로그램입니다.',
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/programs/paps`,
    image: SPOKEDU_IMAGES.programs.paps.src,
    imageAlt: 'PAPS 연계 놀이체육 활동 장면',
  },
  'oneday-event': {
    title: '원데이 체육행사',
    slug: 'oneday-event',
    category: '행사형',
    description: '기관 행사와 특별활동에 맞춘 체육 기반 체험 프로그램',
    connectedTracks: ['Dispatch'],
    effects: ['몰입', '협동', '체험', '단체활동'],
    target: '기관 행사, 계절 이벤트, 특별활동',
    expandable: true,
    detailDescription: '어린이날, 시즌 행사, 기관 특별활동에 맞춘 체육 기반 특별 프로그램입니다.',
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
    image: SPOKEDU_IMAGES.programs.oneDay.src,
    imageAlt: '원데이 체육행사 단체 활동 장면',
  },
  camp: {
    title: '방학캠프',
    slug: 'camp',
    category: '캠프형',
    description: '체육과 예체능을 결합한 방학 시즌 집중 프로그램',
    connectedTracks: ['Private', 'Dispatch'],
    effects: ['종일체험', '돌봄', '신체활동', '협동'],
    target: '방학 시즌 집중 운영, 기관/공간 연계 캠프',
    expandable: true,
    detailDescription: '체육과 예체능을 결합한 방학 시즌 집중 프로그램입니다.',
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/programs/camp`,
    image: SPOKEDU_IMAGES.programs.camp.src,
    imageAlt: '방학캠프에서 체육과 예체능 활동을 하는 장면',
  },
  'play-class': {
    title: '놀이체육 정규수업',
    slug: 'play-class',
    category: '놀이체육',
    description: '기본 움직임과 운동 습관을 만드는 스포키듀의 기본 수업 자산',
    connectedTracks: ['Private', 'Dispatch'],
    effects: ['기본움직임', '운동습관', '자신감', '사회성'],
    target: '개인·소그룹 및 기관 정규수업',
    expandable: false,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
    href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
    image: SPOKEDU_IMAGES.programs.playClass.src,
    imageAlt: '놀이체육 정규수업에서 아이들이 움직이는 장면',
  },
  'curriculum-content': {
    title: '커리큘럼 콘텐츠',
    slug: 'curriculum-content',
    category: '콘텐츠',
    description: '수업안, 교구 활용법, 월간 프로그램, 강사 교육 콘텐츠',
    connectedTracks: ['Curriculum'],
    effects: ['수업안', '매뉴얼', '강사교육', '라이선싱'],
    target: '강사 교육, 기관 도입, 파트너 제휴/라이선스',
    expandable: false,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
    href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
    image: SPOKEDU_IMAGES.programs.curriculumContent.src,
    imageAlt: '커리큘럼 콘텐츠 자료와 수업안이 배치된 장면',
  },
  'play-pe': {
    title: 'Play PE',
    slug: 'play-pe',
    category: '놀이체육',
    description: '놀이 중심 체육수업 모듈을 학교/기관 상황에 맞게 적용하는 프로그램',
    connectedTracks: ['Dispatch', 'Curriculum'],
    effects: ['기본움직임', '협동', '수업참여도'],
    target: '초등 저학년~중학년, 기관 정규수업',
    expandable: false,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    image: SPOKEDU_IMAGES.programs.playClass.src,
    imageAlt: 'Play PE 프로그램 안내 이미지',
  },
  'new-sports': {
    title: 'New Sports',
    slug: 'new-sports',
    category: '놀이체육',
    description: '뉴스포츠 기반 협동/민첩 활동을 중심으로 구성한 확장 프로그램',
    connectedTracks: ['Dispatch'],
    effects: ['협동', '민첩성', '참여도'],
    target: '기관 단체 수업, 시즌 특별활동',
    expandable: false,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    image: SPOKEDU_IMAGES.programs.oneDay.src,
    imageAlt: 'New Sports 프로그램 안내 이미지',
  },
  funstick: {
    title: 'Funstick',
    slug: 'funstick',
    category: '놀이체육',
    description: '도구 기반 리듬/반응 활동을 운영할 수 있는 놀이체육 확장 프로그램',
    connectedTracks: ['Private', 'Dispatch'],
    effects: ['리듬감', '반응속도', '집중력'],
    target: '소그룹 수업, 기관 체험형 수업',
    expandable: false,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
    href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
    image: SPOKEDU_IMAGES.programs.playClass.src,
    imageAlt: 'Funstick 프로그램 안내 이미지',
  },
  'curriculum-package': {
    title: 'Curriculum Package',
    slug: 'curriculum-package',
    category: '콘텐츠',
    description: '월간 수업안, 강사 교육, 운영 매뉴얼을 묶은 커리큘럼 패키지',
    connectedTracks: ['Curriculum'],
    effects: ['수업안', '운영표준화', '강사교육'],
    target: '강사팀·기관 도입·브랜드 제휴',
    expandable: false,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
    href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
    image: SPOKEDU_IMAGES.programs.curriculumContent.src,
    imageAlt: 'Curriculum Package 프로그램 안내 이미지',
  },
};

export const programs: ProgramData[] = Object.values(programCatalog);

export const expandableProgramSlugs = Object.values(programCatalog)
  .filter((program) => program.expandable)
  .map((program) => program.slug);

export function getProgramBySlug(slug: ProgramSlug) {
  return programCatalog[slug];
}

export const programAssets: ProgramAssetItem[] = programs.map((program) => ({
  title: program.title,
  description: program.description,
  linksTo: [...program.connectedTracks],
  effects: [...program.effects],
  href: program.href,
  imageSlot: `program-${program.slug}`,
  imageAlt: program.imageAlt,
  imageSrc: program.image,
}));

export type ConsultationPackage = {
  title: string;
  target: string;
  recommendedSituation: string;
  operationFormat: string;
  quotePolicy: '상담 후 안내' | '기관 조건에 따라 제안';
  ctaLabel: string;
  ctaHref: string;
};

export type ConsultationPackageGroup = {
  track: 'Private Class' | 'Dispatch Solution' | 'Curriculum & Contents';
  description: string;
  packages: ConsultationPackage[];
};

export const consultationPackageGroups: ConsultationPackageGroup[] = [
  {
    track: 'Private Class',
    description: '아이의 성향과 현재 운동 경험을 기준으로 개인/소그룹 운영안을 제안합니다.',
    packages: [
      {
        title: '1:1 개인 체육수업',
        target: '운동 자신감이 낮거나 맞춤 지도가 필요한 아이',
        recommendedSituation: '체육 수업 적응이 어렵거나 기본 움직임 보완이 필요한 경우',
        operationFormat: '주 1~2회 맞춤 수업, 보호자 피드백 포함',
        quotePolicy: '상담 후 안내',
        ctaLabel: '우리 아이 수업 상담하기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      },
      {
        title: '2~4명 소그룹 수업',
        target: '또래와 함께 참여하며 사회성/협동을 키우고 싶은 아이',
        recommendedSituation: '친구와 함께 규칙 기반 활동을 시작하고 싶은 경우',
        operationFormat: '소그룹 순환 활동, 역할 기반 미션 수업',
        quotePolicy: '상담 후 안내',
        ctaLabel: '우리 아이 수업 상담하기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      },
      {
        title: '형제·자매 수업',
        target: '형제·자매가 함께 참여하는 가정',
        recommendedSituation: '가정 스케줄을 맞춰 함께 수업을 운영하고 싶은 경우',
        operationFormat: '난이도 분리 운영 + 공통 협동 미션 구성',
        quotePolicy: '상담 후 안내',
        ctaLabel: '우리 아이 수업 상담하기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      },
      {
        title: '방학 집중 수업',
        target: '방학 기간 동안 집중형 움직임 프로그램이 필요한 아이',
        recommendedSituation: '단기간에 체력/운동 습관 루틴을 만들고 싶은 경우',
        operationFormat: '주간 집중 편성, 목표형 단기 운영',
        quotePolicy: '상담 후 안내',
        ctaLabel: '우리 아이 수업 상담하기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      },
    ],
  },
  {
    track: 'Dispatch Solution',
    description: '기관 대상, 공간, 인원, 운영 목적을 바탕으로 파견형 패키지를 제안합니다.',
    packages: [
      {
        title: '기관 정규수업',
        target: '유치원·어린이집·학교·돌봄기관',
        recommendedSituation: '정기 체육 프로그램을 안정적으로 운영하고 싶은 경우',
        operationFormat: '주간/월간 정기 파견, 학급/그룹 맞춤 운영',
        quotePolicy: '기관 조건에 따라 제안',
        ctaLabel: '기관 수업 제안 받기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      },
      {
        title: '원데이 체육행사',
        target: '기관 행사/특별활동 담당자',
        recommendedSituation: '시즌 이벤트나 체육 테마 행사가 필요한 경우',
        operationFormat: '반나절/1일 행사형 스테이션 운영',
        quotePolicy: '기관 조건에 따라 제안',
        ctaLabel: '기관 수업 제안 받기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      },
      {
        title: '방학캠프',
        target: '방학 프로그램을 운영하는 기관 및 키즈공간',
        recommendedSituation: '방학 시즌 집중형 체육 콘텐츠가 필요한 경우',
        operationFormat: '주간 캠프형 커리큘럼 + 협동/체력 활동 운영',
        quotePolicy: '기관 조건에 따라 제안',
        ctaLabel: '기관 수업 제안 받기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      },
      {
        title: 'SPOMOVE 수업',
        target: '에듀테크 기반 체육수업을 도입하려는 기관',
        recommendedSituation: '집중력/반응 기반 활동을 수업에 결합하고 싶은 경우',
        operationFormat: '빔 기반 상호작용 활동 + 기관 환경 맞춤 세팅',
        quotePolicy: '기관 조건에 따라 제안',
        ctaLabel: '기관 수업 제안 받기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      },
      {
        title: 'PAPS 연계 수업',
        target: '기초체력 요소를 놀이형으로 운영하려는 기관',
        recommendedSituation: '평가 부담 없이 체력 요소 경험 수업을 만들고 싶은 경우',
        operationFormat: 'PAPS 요소 기반 놀이 모듈 운영',
        quotePolicy: '기관 조건에 따라 제안',
        ctaLabel: '기관 수업 제안 받기',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      },
    ],
  },
  {
    track: 'Curriculum & Contents',
    description: '수업안, 콘텐츠, 강사 교육, 라이선싱까지 상담형으로 구성해 제안합니다.',
    packages: [
      {
        title: '월간 놀이체육 수업안 패키지',
        target: '정기 수업 콘텐츠가 필요한 강사/기관',
        recommendedSituation: '월 단위 수업안과 운영 포인트를 체계화하고 싶은 경우',
        operationFormat: '월간 주차별 수업안 + 운영 가이드 제공',
        quotePolicy: '상담 후 안내',
        ctaLabel: '커리큘럼·콘텐츠 문의',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      },
      {
        title: '교구별 활동 콘텐츠',
        target: '교구 활용 수업을 확장하려는 강사/기관',
        recommendedSituation: '보유 교구 중심으로 활동 라이브러리를 구축하고 싶은 경우',
        operationFormat: '교구별 활동 시나리오 + 운영 체크포인트 제공',
        quotePolicy: '상담 후 안내',
        ctaLabel: '커리큘럼·콘텐츠 문의',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      },
      {
        title: '강사 교육',
        target: '강사팀 운영 기준을 통일하려는 기관/브랜드',
        recommendedSituation: '신규 강사 온보딩과 운영 품질 표준화가 필요한 경우',
        operationFormat: '운영 원칙 교육 + 실습형 피드백 세션',
        quotePolicy: '기관 조건에 따라 제안',
        ctaLabel: '커리큘럼·콘텐츠 문의',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      },
      {
        title: '기관 맞춤 커리큘럼',
        target: '연령/공간/목표 맞춤 커리큘럼이 필요한 기관',
        recommendedSituation: '기존 프로그램을 기관 상황에 맞게 재구성하고 싶은 경우',
        operationFormat: '기관 진단 기반 맞춤 커리큘럼 설계',
        quotePolicy: '기관 조건에 따라 제안',
        ctaLabel: '커리큘럼·콘텐츠 문의',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      },
      {
        title: '프로그램 라이선싱',
        target: '브랜드형 프로그램 도입/확장이 필요한 사업자',
        recommendedSituation: '검증된 프로그램을 자사 운영 모델에 적용하고 싶은 경우',
        operationFormat: '라이선스 범위 협의 + 운영 매뉴얼/교육 연계',
        quotePolicy: '기관 조건에 따라 제안',
        ctaLabel: '커리큘럼·콘텐츠 문의',
        ctaHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      },
    ],
  },
];
