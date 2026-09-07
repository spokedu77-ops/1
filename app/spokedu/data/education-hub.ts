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
  sectionOrder: ['hero', 'fit', 'operating', 'adjustment', 'cases', 'reviews', 'process', 'faq', 'contact'] as const,
  hero: {
    id: 'hero',
    eyebrow: '체육교육 · 기관수업',
    lines: ['움직이게 하는 수업이 아니라,', '움직이고 싶게 만드는 수업입니다.'] as const,
    lead: '학교·키움센터·복지관 등 기관의 대상, 인원, 공간에 맞춰 지도자가 현장에서 직접 체육수업을 운영합니다.',
    mediaKey: 'homeHeroFieldEducation' as const,
    primaryCta: { label: '기관 체육수업 상담하기', href: CONTACT_HREF, trackLabel: 'education-hero-consult' },
    secondaryCta: { label: '실제 운영 사례 보기', href: '#cases', trackLabel: 'education-hero-cases' },
  },
  fit: {
    id: 'fit',
    title: '기관 조건에 맞춰 구성합니다',
    lead: '기관의 대상, 인원, 공간, 목적을 먼저 확인합니다.',
    items: [
      { label: '공간', condition: '교실 · 활동실 · 강당 · 체육관', response: '이동 범위, 대기 동선, 소음과 안전 범위를 조정합니다.' },
      { label: '인원', condition: '소규모 · 반 단위 · 다인원 행사', response: '강사 배치, 활동 분할과 운영 방식을 조정합니다.' },
      { label: '연령', condition: '유아 · 초등 · 청소년 · 특수·통합', response: '규칙 이해도, 수행 수준과 과제 난이도를 조정합니다.' },
      { label: '운영', condition: '정규수업 · 특강 · 방학 · 행사', response: '회기, 준비물, 기록과 피드백 범위를 조정합니다.' },
    ] as const,
    institutions: '키움센터 · 학교 · 방과후 · 복지관 · 공공기관 · 유치원/어린이집 · 아동문화공간',
    smallSpace: '교실이나 활동실처럼 공간이 작아도 인원, 동선, 소음과 안전 범위를 확인해 구성할 수 있습니다.',
  },
  operating: {
    id: 'operating',
    title: '이렇게 운영할 수 있습니다',
    lead: '기관 일정과 참여 대상에 맞는 형태를 정하고, 그 안에 필요한 활동을 조합합니다.',
    formats: [
      { id: 'regular', title: '정기수업', body: '일정 기간 반복 운영하며 기본 움직임과 놀이체육을 이어갑니다.', example: '예: 주 1회 반 단위 수업' },
      { id: 'seasonal', title: '방학·특강', body: '정해진 기간과 수업 시간에 맞춰 집중 흐름을 구성합니다.', example: '예: 방학 4회기 뉴스포츠' },
      { id: 'oneday', title: '원데이·행사', body: '가족 행사, 미니운동회와 체험 프로그램을 하루 일정에 맞춥니다.', example: '예: 순환형 스포츠 체험' },
      { id: 'inclusive', title: '특수·포용 체육', body: '참여자의 수행 방식에 따라 규칙, 속도, 교구와 동선을 조정합니다.', example: '예: 통합반 단계별 활동' },
    ] as const,
    fieldMedia: [
      { mediaKey: 'homeCaseGeneral' as const, caption: '반 단위 수업에서 활동 구역을 나누어 진행하는 현장' },
      { mediaKey: 'homeCaseAdapted' as const, caption: '참여자의 수행 속도에 맞춰 지도자가 함께 움직이는 현장' },
    ],
    lineup: [
      { name: '펑셔널 무브', description: '기본 움직임을 수업의 바탕으로 구성합니다.', use: '정기수업 · 기초 활동' },
      { name: '팀빌딩', description: '협동 미션과 규칙 있는 팀 활동을 조합합니다.', use: '반 단위 · 관계 형성' },
      { name: 'SPOMOVE', description: '화면의 정보를 보고 판단한 뒤 움직임으로 반응합니다.', use: '웜업 · 반응형 활동' },
      { name: '월간 스포츠', description: '스포츠와 뉴스포츠 종목을 회기별로 순환합니다.', use: '정기수업 · 방과후' },
      { name: '미니올림픽', description: '여러 종목을 협동과 응원 흐름으로 연결합니다.', use: '행사 · 스페셜 클래스' },
      { name: '체험·부스·커스텀', description: '기관 목적과 동선에 맞춰 체험 단위를 새로 조합합니다.', use: '축제 · 공공행사' },
    ] as const,
    spomove: {
      mediaKey: 'homeSpomoveField' as const,
      title: '기관수업 안에서 활용하는 자체 콘텐츠',
      body: '화면의 정보를 확인하고 규칙에 따라 판단한 뒤 움직임으로 반응하는 활동을 일부 수업에 조합합니다.',
      note: '일부 수업에서는 SPOKEDU의 자체 콘텐츠 SPOMOVE를 활용합니다. 모든 수업에 필수로 포함되는 것은 아닙니다.',
    },
  },
  adjustment: {
    id: 'adjustment',
    title: '실제 현장에서 조정합니다',
    lead: '운영안은 현장 조건에 맞춰 수업 안에서 다시 구체화됩니다.',
    items: [
      { label: '설계', body: '대상·공간·운영 목적을 실제 수업안에 반영합니다.' },
      { label: '강사', body: '수업 기준을 공유하고 상황에 따라 배치를 조정합니다.' },
      { label: '현장', body: '공간·인원·수행 수준에 맞춰 동선과 난이도를 조정합니다.' },
      { label: '공유', body: '필요 시 관찰 내용과 다음 회기 조정사항을 정리합니다.' },
    ] as const,
  },
  cases: {
    id: 'cases',
    title: '실제 운영 현장',
    lead: '서로 다른 대상과 일정에서 운영한 기관 체육수업입니다.',
    cards: [
      caseCard('yangcheon-paps', '초등 · 정기수업', '교구와 놀이 활동으로 PAPS 요소를 경험하도록 구성했습니다.', '50% 45%'),
      caseCard('dasarang-oneday', '아동센터 · 원데이 행사', '협동 미션과 움직임 놀이를 하루 일정에 맞춰 운영했습니다.', '48% 42%'),
      caseCard('donghaeng-special-pe', '특수·통합 · 정기수업', '참여자의 수행 방식에 맞춰 규칙과 진행 속도를 조정했습니다.', '50% 40%'),
    ],
  },
  reviews: {
    id: 'reviews',
    title: '기관 담당자가 전하는 경험',
    items: [
      { quote: '수준별 난이도와 참여 순서를 나눠 통합반에서도 활동 흐름을 이어갈 수 있었습니다.', meta: '센터 담당자 · 찾아가는 동행 체육교실' },
      { quote: '회차별 활동 목적이 분명해 기관 운영 계획과 맞추기 쉬웠습니다.', meta: '센터 담당자 · 양천거점형키움센터' },
      { quote: '좁은 공간과 변동 인원에도 대기와 활동 동선을 현장에서 맞춰 주셨습니다.', meta: '담당자 · 강동구 보건소 연계 수업' },
    ] as const,
  },
  process: {
    id: 'process', title: '진행 과정',
    steps: [
      { title: '조건 확인', body: '연령, 인원, 공간과 일정을 확인합니다.' },
      { title: '운영안 제안', body: '프로그램, 동선, 강사와 준비물 범위를 제안합니다.' },
      { title: '수업 진행', body: '사전 조율한 기준으로 현장 수업을 운영합니다.' },
    ] as const,
    note: '필요 시 운영 후 관찰 내용과 다음 회기 조정사항을 공유합니다.',
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
    id: 'contact', title: '기관 체육수업을 함께 구성해 보세요.',
    lead: '대상, 인원, 공간, 일정이 정리되어 있지 않아도 가능한 조건부터 함께 확인합니다.',
    primaryCta: { label: '기관 체육수업 상담하기', href: CONTACT_HREF, trackLabel: 'education-contact-inquiry' },
  },
} as const;
