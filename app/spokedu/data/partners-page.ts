import { SPOKEDU_BASE_PATH } from './site';

/**
 * 파트너·협업 안내 — Contact Primary를 대체하지 않음.
 * 상단 IA 1급 메뉴 추가 없음. About/Footer/Contact에서 보조 연결.
 */
export const partnersPage = {
  sectionOrder: ['intro', 'categories', 'notes', 'cta'] as const,

  intro: {
    id: 'intro',
    eyebrow: '파트너·협업',
    title: 'SPOKEDU와 협업할 수 있는 범위를 안내합니다',
    lead:
      '기관 프로그램, 콘텐츠·장비, 지도자 교육 등 실제 운영과 연결되는 협업만 검토합니다. 모든 제안을 무조건 수용하지 않습니다.',
  },

  categories: {
    id: 'categories',
    eyebrow: '범위',
    title: '협업 범주',
    items: [
      {
        id: 'institution',
        title: '기관·공공 협업',
        body: '정규수업, 특강, 원데이·행사 등 체육 프로그램 운영 협의.',
        bullets: ['정규수업', '특강', '행사·부스'] as const,
      },
      {
        id: 'content',
        title: '콘텐츠·장비 협업',
        body: '교구·디스플레이·교육 콘텐츠 등 실제 수업 활용과 연결된 제작·공급 협의.',
        bullets: ['교구', '디스플레이', '수업 콘텐츠'] as const,
      },
      {
        id: 'education',
        title: '지도자·교육',
        body: '지도자 교육, 커리큘럼·워크숍 등 교육 범위 협의.',
        bullets: ['세미나', '커리큘럼', '워크숍'] as const,
      },
    ] as const,
  },

  notes: {
    id: 'notes',
    eyebrow: '안내',
    title: '협업 시 참고',
    items: [
      '협찬·도달률·판매량을 보장하지 않습니다.',
      '상대 기업명을 허락 없이 파트너로 표기하지 않습니다.',
      '문의는 목적·범위·일정을 남겨 주시면 검토 후 안내합니다.',
    ] as const,
  },

  cta: {
    id: 'cta',
    title: '협업 문의는 Contact에서 이어집니다',
    lead: '이 페이지는 안내입니다. 접수 Primary는 문의·협업 폼입니다.',
    primary: {
      label: '협업 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=other`,
      trackLabel: 'partners-cta-contact',
    },
    secondary: {
      label: '스포키듀 소개',
      href: `${SPOKEDU_BASE_PATH}/about`,
      trackLabel: 'partners-cta-about',
    },
  },
} as const;
