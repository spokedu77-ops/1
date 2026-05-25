import { SPOKEDU_IMAGE_ROOT } from './images';

export type NewsportsThemeSlug =
  | 'floor-curling'
  | 'floorball'
  | 'pickleball'
  | 'funstick'
  | 'tball'
  | 'padminton'
  | 'flying-disc'
  | 'kinball'
  | 'play-rope'
  | 'modified-ball'
  | 'flag-football'
  | 'sport-stacking';

export type NewsportsTheme = {
  order: number;
  slug: NewsportsThemeSlug;
  title: string;
  tag: string;
  description: string;
  keywords: readonly string[];
  photoLabel: { title: string; subtitle: string };
  imageSrc: string;
  imageAlt: string;
};

function themeImage(slug: NewsportsThemeSlug, alt: string): Pick<NewsportsTheme, 'imageSrc' | 'imageAlt'> {
  return {
    imageSrc: `${SPOKEDU_IMAGE_ROOT}/programs/newsports/${slug}.jpg`,
    imageAlt: alt,
  };
}

/** 우선 제안 순서 — HTML 12테마 카탈로그와 동일 */
export const NEWSPORTS_THEMES: readonly NewsportsTheme[] = [
  {
    order: 1,
    slug: 'floor-curling',
    title: '플로어컬링',
    tag: '타깃형',
    description: '목표 지점을 보고 힘과 방향을 조절하는 안전한 타깃형 뉴스포츠입니다.',
    keywords: ['집중력', '힘 조절', '거리감'],
    photoLabel: { title: 'Floor Curling', subtitle: 'Target Sports' },
    ...themeImage('floor-curling', '플로어컬링 뉴스포츠 수업'),
  },
  {
    order: 2,
    slug: 'floorball',
    title: '플로어볼',
    tag: '스틱형',
    description: '스틱으로 공을 조작하며 패스, 드리블, 슈팅을 경험하는 실내 침투형 스포츠입니다.',
    keywords: ['스틱 조작', '패스', '공수 전환'],
    photoLabel: { title: 'Floorball', subtitle: 'Invasion Game' },
    ...themeImage('floorball', '플로어볼 뉴스포츠 수업'),
  },
  {
    order: 3,
    slug: 'pickleball',
    title: '피클볼',
    tag: '네트형',
    description: '패들과 공을 활용해 랠리, 위치 선정, 네트형 경기 이해를 경험하는 스포츠입니다.',
    keywords: ['랠리', '패들 조작', '위치 선정'],
    photoLabel: { title: 'Pickleball', subtitle: 'Net Game' },
    ...themeImage('pickleball', '피클볼 뉴스포츠 수업'),
  },
  {
    order: 4,
    slug: 'funstick',
    title: '펀스틱 놀이체육',
    tag: '반응형',
    description:
      '펀스틱 펜싱을 대표 프로그램으로, 거리감과 타이밍, 반응속도를 기르는 안전한 대결형 수업입니다.',
    keywords: ['펀스틱 펜싱', '반응속도', '거리감'],
    photoLabel: { title: 'Fun Stick', subtitle: 'Reaction Sports' },
    ...themeImage('funstick', '펀스틱 놀이체육 수업'),
  },
  {
    order: 5,
    slug: 'tball',
    title: '티볼 · 플레이트볼',
    tag: '필드형',
    description: '치고, 달리고, 수비하며 타격과 경기 흐름을 배우는 필드형 뉴스포츠 프로그램입니다.',
    keywords: ['타격', '주루', '수비 판단'],
    photoLabel: { title: 'T-Ball', subtitle: 'Field Game' },
    ...themeImage('tball', '티볼·플레이트볼 수업'),
  },
  {
    order: 6,
    slug: 'padminton',
    title: '패드민턴 · 배드민턴',
    tag: '라켓형',
    description:
      '패드민턴으로 라켓 조작을 쉽게 시작하고, 배드민턴까지 확장하는 민턴형 스포츠 프로그램입니다.',
    keywords: ['손-눈 협응', '타이밍', '랠리'],
    photoLabel: { title: 'Padminton', subtitle: 'Racket Sports' },
    ...themeImage('padminton', '패드민턴·배드민턴 수업'),
  },
  {
    order: 7,
    slug: 'flying-disc',
    title: '플라잉디스크',
    tag: '디스크형',
    description: '디스크를 던지고 받으며 방향 조절과 공간 이동을 경험하는 뉴스포츠입니다.',
    keywords: ['던지기', '받기', '공간 인식'],
    photoLabel: { title: 'Flying Disc', subtitle: 'Disc Sports' },
    ...themeImage('flying-disc', '플라잉디스크 수업'),
  },
  {
    order: 8,
    slug: 'kinball',
    title: '킨볼',
    tag: '협동형',
    description: '대형볼을 활용해 팀원과 함께 움직이고 소통하는 협동형 뉴스포츠입니다.',
    keywords: ['협동', '소통', '팀워크'],
    photoLabel: { title: 'Kin-Ball', subtitle: 'Team Sports' },
    ...themeImage('kinball', '킨볼 협동 수업'),
  },
  {
    order: 9,
    slug: 'play-rope',
    title: '플레이 로프',
    tag: '기초 움직임형',
    description: '줄바토런, 줄다리기, 점프밴드, 긴줄넘기 등을 포함한 줄 활용 놀이체육 프로그램입니다.',
    keywords: ['리듬감', '협응력', '팀워크'],
    photoLabel: { title: 'Play Rope', subtitle: 'Rope Activity' },
    ...themeImage('play-rope', '플레이 로프 수업'),
  },
  {
    order: 10,
    slug: 'modified-ball',
    title: '변형 구기',
    tag: '변형 구기',
    description:
      '변형 피구, 가가볼, 도지비, 펀이볼 등을 활용해 회피, 반응, 공간 판단을 경험하는 프로그램입니다.',
    keywords: ['가가볼', '도지비', '회피 반응'],
    photoLabel: { title: 'Modified Ball', subtitle: 'Dodge & Reaction' },
    ...themeImage('modified-ball', '변형 구기 수업'),
  },
  {
    order: 11,
    slug: 'flag-football',
    title: '플래그풋볼',
    tag: '침투형',
    description: '태클 없이 달리기, 패스, 작전 수행을 경험하는 비접촉 팀 스포츠입니다.',
    keywords: ['공간 침투', '패스', '팀 전략'],
    photoLabel: { title: 'Flag Football', subtitle: 'Team Strategy' },
    ...themeImage('flag-football', '플래그풋볼 수업'),
  },
  {
    order: 12,
    slug: 'sport-stacking',
    title: '스포츠스태킹',
    tag: '실내형',
    description: '컵을 빠르고 정확하게 쌓으며 집중력, 순발력, 양손 협응을 기르는 실내 스포츠입니다.',
    keywords: ['집중력', '양손 협응', '기록 도전'],
    photoLabel: { title: 'Sport Stacking', subtitle: 'Indoor Challenge' },
    ...themeImage('sport-stacking', '스포츠스태킹 수업'),
  },
] as const;

export const NEWSPORTS_THEMES_SECTION_ID = 'newsports-themes';

export function getNewsportsThemeBySlug(slug: NewsportsThemeSlug): NewsportsTheme | undefined {
  return NEWSPORTS_THEMES.find((theme) => theme.slug === slug);
}
