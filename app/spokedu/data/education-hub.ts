import { getFieldRecordCatalogItem, type FieldRecordSlug } from './field-records-catalog';
import { SPOKEDU_PATHS } from './site';

const CONTACT_HREF = `${SPOKEDU_PATHS.contact}?type=dispatch`;

export type EducationHubCaseCard = {
  slug: FieldRecordSlug;
  venue: string;
  context: string;
  description: string;
  href: string;
  trackLabel: string;
  thumbnailSrc: string;
  objectPosition?: string;
};

function caseCard(
  slug: FieldRecordSlug,
  context: string,
  description: string,
  objectPosition: string,
): EducationHubCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  return {
    slug,
    venue: item.venue,
    context,
    description,
    href: item.href,
    trackLabel: `education-case-${slug}`,
    thumbnailSrc: item.thumbnailSrc!,
    objectPosition,
  };
}

export const educationHubPage = {
  sectionOrder: ['hero', 'fit', 'operating', 'comparison', 'adjustment', 'cases', 'reviews', 'process', 'faq', 'contact'] as const,
  hero: {
    id: 'hero',
    eyebrow: '체육교육 · 기관수업',
    lines: ['움직이게 하는 수업이 아니라,', '움직이고 싶게 만드는 수업입니다.'] as const,
    lead: '학교·키움센터·복지관 등 기관의 대상, 인원, 공간에 맞춰 지도자가 현장에서 직접 체육수업을 운영합니다.',
    mediaKey: 'homeCaseGeneral' as const,
    primaryCta: { label: '기관 체육수업 상담하기', href: CONTACT_HREF, trackLabel: 'education-hero-consult' },
    secondaryCta: { label: '실제 운영 사례 보기', href: '#cases', trackLabel: 'education-hero-cases' },
  },
  fit: {
    id: 'fit',
    title: '기관 조건에 맞춰 구성합니다',
    lead: '기관의 대상, 인원, 공간, 목적을 먼저 확인합니다.',
    statement: '공간이 달라지면 동선을, 인원이 달라지면 배치를, 연령과 운영 형태에 따라 수업 구성을 바꿉니다.',
    items: [
      {
        label: '공간',
        condition: ['교실', '활동실', '강당', '체육관'],
        response: '이동 범위, 대기 동선, 소음, 안전 범위를 먼저 조정합니다.',
        note: '교실에서는 이동을 줄이고, 강당에서는 구역과 대기를 나눕니다.',
      },
      {
        label: '인원',
        condition: ['소규모', '반 단위', '다인원 행사'],
        response: '팀 구성, 활동 분할, 강사 배치 기준을 정합니다.',
        note: '대기 시간이 길어지지 않게 흐름을 나눕니다.',
      },
      {
        label: '연령',
        condition: ['유아', '초등', '청소년', '특수·통합'],
        response: '규칙 이해도와 수행 속도에 맞춰 과제 난이도를 나눕니다.',
        note: '같은 공간에서도 참여 순서를 다르게 둘 수 있습니다.',
      },
      {
        label: '운영',
        condition: ['정규수업', '특강', '방학', '행사'],
        response: '회기, 준비물, 기록 공유, 현장 피드백 범위를 정합니다.',
        note: '하루 일정과 학기 운영은 준비 범위가 다릅니다.',
      },
    ] as const,
    institutions: ['키움센터', '학교', '방과후', '복지관', '공공기관', '유치원/어린이집', '아동문화공간'],
    smallSpace: '교실이나 활동실처럼 공간이 작아도 인원, 동선, 소음과 안전 범위를 확인해 구성할 수 있습니다.',
  },
  operating: {
    id: 'operating',
    title: '이렇게 운영할 수 있습니다',
    lead: '기관 일정과 참여 대상에 맞는 형태를 정하고, 그 안에 필요한 활동을 조합합니다.',
    formats: [
      {
        id: 'regular',
        title: '정기수업',
        body: '기관 일정에 맞춰 반복 운영합니다.',
        example: '주 1회 반 단위 · 연속 커리큘럼',
      },
      {
        id: 'seasonal',
        title: '방학·특강',
        body: '짧은 기간에 집중 프로그램을 구성합니다.',
        example: '방학 4회기 · 뉴스포츠',
      },
      {
        id: 'oneday',
        title: '원데이·행사',
        body: '하루 일정에 맞춰 참여 흐름을 만듭니다.',
        example: '가족 체육 · 순환형 체험',
      },
      {
        id: 'inclusive',
        title: '특수·포용 체육',
        body: '수행 방식에 맞춰 규칙과 속도를 조정합니다.',
        example: '통합반 · 단계별 활동',
      },
    ] as const,
    fieldMedia: [
      {
        mediaKey: 'homeHeroMovement' as const,
        caption: '반 단위 수업에서 활동 구역을 나눠 대기 시간을 줄인 운영',
      },
      {
        mediaKey: 'homeCaseAdapted' as const,
        caption: '참여자의 수행 속도에 맞춰 지도자가 함께 움직이며 조정한 수업',
      },
    ],
    lineupTitle: '기관 목적에 따라 조합하는 운영 콘텐츠',
    lineupLead: '하나를 상품처럼 고르는 목록이 아니라, 대상과 운영 목적에 맞춰 수업 안에 조합하는 범위입니다.',
    lineup: [
      {
        id: 'functional-move',
        name: '펑셔널 무브',
        description: '기본 움직임을 수업의 바탕으로 구성합니다.',
        use: ['정기수업', '기초 활동'],
        details: {
          intro: '기본 움직임을 수업의 기초로 두고, 이동·균형·협응을 이어가도록 구성합니다.',
          recommendedFor: ['정기 체육수업', '저학년 및 입문 단계', '기초 움직임 경험이 필요한 그룹'],
          activities: ['이동운동기술', '균형', '협응', '기초 조작활동'],
          formats: ['정기수업', '단회 특강'],
        },
      },
      {
        id: 'teambuilding',
        name: '팀빌딩',
        description: '협동 미션과 규칙 있는 팀 활동을 조합합니다.',
        use: ['반 단위', '관계 형성'],
        details: {
          intro: '협동 미션과 규칙 있는 팀 활동으로 관계 형성과 공동 목표 경험을 설계합니다.',
          recommendedFor: ['학급 관계 형성', '캠프', '원데이 프로그램', '기관 행사'],
          activities: ['협동 이동', '팀 미션', '전략 게임', '공동 목표 활동'],
          formats: ['단회', '특강', '행사'],
        },
      },
      {
        id: 'spomove',
        name: 'SPOMOVE',
        description: '화면의 정보를 보고 판단한 뒤 움직임으로 반응합니다.',
        use: ['웜업', '반응형 활동'],
        details: {
          intro: '색·방향·이미지 같은 화면 정보를 확인한 뒤, 주어진 규칙에 따라 움직임으로 반응하는 활동입니다.',
          recommendedFor: ['수업 워밍업', '시지각 반응 활동', '선택 반응 과제', '수업 전환 활동'],
          activities: ['색상·방향 자극', '시지각 반응', '선택 반응', '규칙에 따른 수행'],
          formats: ['정기수업 일부', '체험형 활동'],
          mediaKey: 'homeCaseSpomove' as const,
        },
      },
      {
        id: 'monthly-sports',
        name: '월간 스포츠',
        description: '스포츠와 뉴스포츠 종목을 회기별로 순환합니다.',
        use: ['정기수업', '방과후'],
        details: {
          intro: '스포츠와 뉴스포츠 종목을 회기별 테마로 순환해 참여를 이어갑니다.',
          recommendedFor: ['정기수업', '방과후', '종목 경험 확대'],
          activities: ['뉴스포츠', '구기 종목', '라켓 스포츠', '시즌별 스포츠'],
          formats: ['정기수업', '방과후', '월간 테마'],
        },
      },
      {
        id: 'mini-olympics',
        name: '미니올림픽',
        description: '여러 종목을 협동과 응원 흐름으로 연결합니다.',
        use: ['행사', '스페셜 클래스'],
        details: {
          intro: '여러 종목을 팀 협동과 응원 흐름으로 연결해 하루 또는 단기 이벤트로 구성합니다.',
          recommendedFor: ['기관 행사', '캠프', '학급 이벤트', '특별수업'],
          activities: ['팀별 종목', '릴레이', '협동 경기', '기록형 경기'],
          formats: ['행사', '스페셜 클래스', '원데이'],
        },
      },
      {
        id: 'custom-booth',
        name: '체험·부스·커스텀',
        description: '기관 목적과 동선에 맞춰 체험 단위를 새로 조합합니다.',
        use: ['축제', '공공행사'],
        details: {
          intro: '기관 목적과 동선에 맞춰 체험 단위를 조합합니다. 짧은 순환부터 맞춤 구성까지 가능합니다.',
          recommendedFor: ['축제', '박람회', '공공행사', '체험부스'],
          activities: ['체험형 스포츠', '순환형 활동', '기관 맞춤 콘텐츠'],
          formats: ['부스', '행사', '커스텀 프로그램'],
        },
      },
    ],
    spomove: {
      mediaKey: 'homeCaseSpomove' as const,
      title: '수업 안에서 화면을 보고 움직입니다',
      body: '워밍업이나 전환 구간에 화면 정보를 확인하고, 규칙에 따라 움직임으로 반응하는 활동을 일부 수업에 조합합니다.',
      note: '일부 수업에서는 SPOKEDU의 자체 콘텐츠 SPOMOVE를 활용합니다. 모든 수업에 필수로 포함되는 것은 아닙니다.',
    },
  },
  comparison: {
    id: 'comparison',
    badge: '운영 기준',
    title: '수업 방식의 차이를 먼저 확인하세요',
    lead: '종목 수보다 설계, 강사 기준, 현장 조정, 운영 후 공유가 기관 운영을 가릅니다.',
    ours: 'SPOKEDU',
    theirs: '단순 프로그램 제공',
    rows: [
      {
        label: '핵심 커리큘럼',
        spokedu: '펑셔널 무브와 팀빌딩을 바탕으로 기관 목적에 맞춰 활동을 조합합니다.',
        other: '강사 재량으로 당일 활동을 고르는 경우가 많습니다.',
      },
      {
        label: '강사 운영 기준',
        spokedu: '수업 기준을 공유한 뒤 대상과 일정에 맞춰 배정합니다.',
        other: '단기 인력 중심으로 당일 진행하는 경우가 많습니다.',
      },
      {
        label: '결근·변동 대응',
        spokedu: '부재가 생기면 기관에 공유하고 대체 운영을 조율합니다.',
        other: '휴강으로 끝나는 경우가 많습니다.',
      },
      {
        label: '수업 진행 방식',
        spokedu: '공간, 인원, 수행 속도에 맞춰 동선과 난이도를 현장에서 조정합니다.',
        other: '정해진 활동을 시간 안에 진행하는 데 머무는 경우가 많습니다.',
      },
      {
        label: '운영 후 공유',
        spokedu: '필요하면 관찰 내용과 다음 회기 조정사항을 정리해 공유합니다.',
        other: '수업 종료로 끝나는 경우가 많습니다.',
      },
    ] as const,
  },
  adjustment: {
    id: 'adjustment',
    title: '실제 현장에서 조정합니다',
    lead: '운영안은 현장 조건에 맞춰 수업 안에서 다시 구체화됩니다.',
    items: [
      { label: '설계', keys: ['대상', '공간', '목적'], body: '확인한 조건을 실제 수업안에 반영합니다.' },
      { label: '강사', keys: ['기준 공유', '배치'], body: '수업 기준을 공유하고 인원·공간에 맞춰 배치합니다.' },
      { label: '진행', keys: ['동선', '난이도', '속도'], body: '현장에서 동선, 난이도, 수행 속도를 조정합니다.' },
      { label: '공유', keys: ['관찰', '다음 회기'], body: '필요하면 관찰과 다음 회기 조정사항을 정리합니다.' },
    ] as const,
  },
  cases: {
    id: 'cases',
    title: '실제 운영 현장',
    lead: '서로 다른 대상과 일정에서 운영한 기관 체육수업입니다.',
    cards: [
      caseCard('yangcheon-paps', '초등 · 정기수업', '교구와 놀이 활동으로 PAPS 요소를 경험하도록 구성했습니다.', '52% 42%'),
      caseCard('dasarang-oneday', '아동센터 · 원데이 행사', '협동 미션과 움직임 놀이를 하루 일정에 맞춰 운영했습니다.', '46% 38%'),
      caseCard('donghaeng-special-pe', '특수·통합 · 정기수업', '참여자의 수행 방식에 맞춰 규칙과 진행 속도를 조정했습니다.', '48% 36%'),
    ],
  },
  reviews: {
    id: 'reviews',
    badge: '기관 후기',
    title: '기관 담당자가 전하는 경험',
    lead: '수업이 현장에서 어떻게 맞춰졌는지를 담당자 경험으로 확인합니다.',
    items: [
      {
        headline: '느린 학습자도 함께 참여할 수 있는 수업 구성',
        quote: '수준별 난이도와 참여 순서를 나눠 통합반에서도 활동이 이어지도록 맞춰 주셨습니다.',
        name: '센터 담당자',
        org: '찾아가는 동행 체육교실',
      },
      {
        headline: '회차마다 목적이 분명한 수업',
        quote: '회차별 활동 목적이 분명해 기관 운영 계획과 맞추기 쉬웠습니다.',
        name: '센터 담당자',
        org: '양천거점형키움센터',
      },
      {
        headline: '공간과 인원에 맞는 현장 조정',
        quote: '좁은 공간과 변동 인원에도 대기와 동선을 현장에서 맞춰 주셨습니다.',
        name: '담당자',
        org: '강동구 보건소 연계 수업',
      },
    ] as const,
  },
  process: {
    id: 'process',
    title: '도입 과정',
    lead: '조건을 확인한 뒤, 실제 수업이 가능한 운영안으로 구체화합니다.',
    steps: [
      {
        n: '01',
        title: '조건 확인',
        keys: ['대상', '인원', '공간', '일정'],
        body: '기관의 운영 목적과 수업 환경을 확인합니다.',
      },
      {
        n: '02',
        title: '운영안 구성',
        keys: ['프로그램', '회기', '강사', '교구'],
        body: '기관 조건에 맞춰 수업 흐름과 준비 범위를 제안합니다.',
      },
      {
        n: '03',
        title: '현장 운영',
        keys: ['수업 진행', '난이도 조정', '운영 공유'],
        body: '사전 조율한 기준으로 수업하고, 필요한 사항은 다음 회기에 반영합니다.',
      },
    ] as const,
  },
  faq: {
    id: 'faq', title: '자주 묻는 질문',
    items: [
      { q: '수업 비용은 어떻게 정해지나요?', a: '대상, 인원, 지역, 회기와 운영 형태를 확인한 뒤 안내합니다.' },
      { q: '몇 회기부터 가능한가요?', a: '원데이부터 단기 특강, 정기수업까지 가능합니다.' },
      { q: '교구는 누가 준비하나요?', a: '수업 구성에 필요한 교구 범위를 운영안에 함께 안내합니다.' },
      { q: '강사는 어떻게 배정되나요?', a: '대상과 프로그램 경험, 일정과 지역을 고려해 배정합니다.' },
      { q: '통합반·특수 대상도 가능한가요?', a: '대상 특성과 필요한 지원 범위를 먼저 확인해 가능 여부와 운영 방식을 안내합니다.' },
      { q: '운영 지역은 어디까지인가요?', a: '현재 서울과 수도권 근교를 중심으로 운영하며, 지역별 가능 여부는 상담 시 확인합니다.' },
      { q: '공간이 작아도 가능한가요?', a: '가능합니다. 활동 면적, 대기 동선, 소음과 안전 범위에 맞춰 활동을 조정합니다.' },
    ] as const,
  },
  contact: {
    id: 'contact',
    title: '기관 체육수업을 함께 구성해 보세요.',
    titleLines: ['기관 체육수업을', '함께 구성해 보세요.'] as const,
    lead: '대상, 인원, 공간, 일정이 정리되어 있지 않아도 가능한 조건부터 함께 확인합니다.',
    primaryCta: { label: '기관 체육수업 상담하기', href: CONTACT_HREF, trackLabel: 'education-contact-inquiry' },
  },
} as const;

export type EducationProgram = (typeof educationHubPage.operating.lineup)[number];
