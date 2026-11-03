import { educationHubPage } from '../../data/education-hub';

const lineup = educationHubPage.operating.lineup;
const program = (id: string) => lineup.find(item => item.id === id)!;

/** Six operating categories; constituent activities stay inside the custom class. */
export const educationPrograms = [
  { ...program('spomove'), image: '/images/spokedu/dispatch/dispatch-group-class.jpg' },
  { ...program('monthly-sports'), image: '/images/spokedu/home/field-editorial/home-hero-field.webp' },
  {
    id: 'inclusive', name: '특수·포용 체육',
    description: educationHubPage.operating.formats[3].body,
    use: ['통합반', '단계별 활동'],
    details: {
      intro: '대상 특성과 필요한 지원 범위를 먼저 확인해 가능 여부와 운영 방식을 안내합니다.',
      recommendedFor: ['특수학급', '발달지연·느린학습자', '통합 체육수업'],
      activities: ['규칙 조정', '수행 속도 조정', '단계별 움직임'],
    },
    image: '/images/spokedu/records/donghaeng-special-pe.jpg',
  },
  { ...program('mini-olympics'), image: '/images/spokedu/records/shinwol-integrated-pe.jpg' },
  { ...program('custom-booth'), image: '/images/spokedu/records/seodaemun-event-booth.jpg' },
  {
    id: 'custom-class', name: '기관 맞춤 프로그램',
    description: educationHubPage.operating.lead,
    use: ['정기수업', '방학·특강', '원데이'],
    details: {
      intro: '기관의 대상·일정·공간과 운영 목적을 확인하고 필요한 활동을 조합합니다.',
      recommendedFor: [...program('functional-move').details.recommendedFor, ...program('teambuilding').details.recommendedFor],
      activities: ['펑셔널 무브', '팀빌딩', '기초 조작활동', '협동 미션'],
    },
    image: '/images/spokedu/복지관_민첩성 놀이체육.jpg',
  },
] as const;
