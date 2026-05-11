/**
 * SPOKEDU PRO 대시보드 큐레이션 기본값.
 * center_content 또는 tenant_content의 dashboard_v4 payload와 병합해 사용한다.
 */

export const THEME_KEYS = [
  'intro',
  'co-op',
  'speed-reaction',
  'cognitive',
  'challenge',
  'tag-duel',
  'variant-sports',
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

export const THEME_LABELS: Record<ThemeKey, string> = {
  intro: '인트로',
  'co-op': '협동 체육',
  'speed-reaction': '스피드 리액션',
  cognitive: '인지 발달',
  challenge: '챌린지',
  'tag-duel': '꼬리잡기 대결',
  'variant-sports': '변형 스포츠',
};

export const ROW1_ROLES = ['Intro', 'Core', 'Play', 'Screen', 'Cooldown'] as const;
export type Row1Role = (typeof ROW1_ROLES)[number];

export interface DashboardItemRow1 {
  programId: number;
  role: string;
  tag2: string[];
}

export interface DashboardItemRow2 {
  programId: number;
  tag2: string[];
}

export interface WeekTheme {
  badge: string;
  title: string;
  subtitle: string;
  themeKey: ThemeKey;
  items: DashboardItemRow1[];
  ctaPrimary?: { label: string; action: string };
  ctaSecondary?: { label: string; action: string };
}

export interface Row2Block {
  title: string;
  preset: string;
  items: DashboardItemRow2[];
}

export interface EquipmentSpotlightConfig {
  equipmentCatalogItem: string;
  sectionTitle?: string;
}

export interface DashboardV4 {
  weekTheme: WeekTheme;
  row2: Row2Block;
  equipmentSpotlight: EquipmentSpotlightConfig | null;
}

const defaultWeekTheme: WeekTheme = {
  badge: '이번 주 테마',
  title: '스피드 리액션',
  subtitle:
    '놀이체육 라이브러리와 SPOMOVE 반응훈련을 함께 연결해 수업 준비는 줄이고 아이들의 몰입은 높입니다.',
  themeKey: 'speed-reaction',
  items: [
    { programId: 1, role: 'Intro', tag2: ['준비물 적음', '집중 유도'] },
    { programId: 2, role: 'Core', tag2: ['인지 발달', '규칙 학습'] },
    { programId: 3, role: 'Play', tag2: ['협동 미션', '팀 대결'] },
    { programId: 4, role: 'Screen', tag2: ['리액션', '몰입'] },
  ],
  ctaPrimary: { label: '수업 시작', action: 'start_theme' },
  ctaSecondary: { label: '상세 보기', action: 'open_theme_detail' },
};

const defaultRow2: Row2Block = {
  title: '선생님 베스트 활동',
  preset: 'best',
  items: [
    { programId: 5, tag2: ['스피드', '순발력'] },
    { programId: 6, tag2: ['협동', '규칙'] },
    { programId: 7, tag2: ['인지', '반응'] },
    { programId: 8, tag2: ['꼬리잡기', '대결'] },
  ],
};

export const DEFAULT_DASHBOARD_V4: DashboardV4 = {
  weekTheme: defaultWeekTheme,
  row2: defaultRow2,
  equipmentSpotlight: {
    equipmentCatalogItem: '후프',
  },
};

export function mergePublishedDashboardV4(stored: unknown): DashboardV4 {
  const defaults = DEFAULT_DASHBOARD_V4;
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaults;

  const storedDashboard = stored as Partial<DashboardV4>;
  if (!storedDashboard.weekTheme || !storedDashboard.row2) return defaults;

  const weekTheme: WeekTheme = {
    ...defaults.weekTheme,
    ...storedDashboard.weekTheme,
    items:
      Array.isArray(storedDashboard.weekTheme.items) && storedDashboard.weekTheme.items.length > 0
        ? storedDashboard.weekTheme.items
        : defaults.weekTheme.items,
  };

  const row2: Row2Block = {
    ...defaults.row2,
    ...storedDashboard.row2,
    items:
      Array.isArray(storedDashboard.row2.items) && storedDashboard.row2.items.length > 0
        ? storedDashboard.row2.items
        : defaults.row2.items,
  };

  let equipmentSpotlight: DashboardV4['equipmentSpotlight'];
  if (storedDashboard.equipmentSpotlight === null) {
    equipmentSpotlight = null;
  } else if (
    storedDashboard.equipmentSpotlight &&
    typeof storedDashboard.equipmentSpotlight === 'object' &&
    typeof (storedDashboard.equipmentSpotlight as EquipmentSpotlightConfig).equipmentCatalogItem === 'string'
  ) {
    equipmentSpotlight = {
      ...(defaults.equipmentSpotlight ?? { equipmentCatalogItem: '후프' }),
      ...storedDashboard.equipmentSpotlight,
    };
  } else {
    equipmentSpotlight = defaults.equipmentSpotlight;
  }

  return { weekTheme, row2, equipmentSpotlight };
}

const THEMES = [
  '인트로 프로그램',
  '협동 체육',
  '스피드 리액션',
  '인지 발달',
  '챌린지',
  '꼬리잡기 대결',
  '변형 스포츠',
];
const ROLES = ['Intro', 'Lead-up', 'Core', 'Play', 'Screen', 'Cooldown', 'Finisher'];
const GRADIENTS = ['from-orange-500 to-red-600', 'from-emerald-500 to-teal-600', 'from-purple-500 to-indigo-600'];
const CATEGORIES = ['Play', 'Think', 'Grow'] as const;

export const THEME_KEY_TO_BANK_THEME: Record<ThemeKey, string> = {
  intro: '인트로 프로그램',
  'co-op': '협동 체육',
  'speed-reaction': '스피드 리액션',
  cognitive: '인지 발달',
  challenge: '챌린지',
  'tag-duel': '꼬리잡기 대결',
  'variant-sports': '변형 스포츠',
};

export const LIBRARY_SIDEBAR_ITEMS: { themeKey: ThemeKey; label: string }[] = [
  { themeKey: 'co-op', label: '놀이체육 라이브러리' },
  { themeKey: 'cognitive', label: 'SPOMOVE 반응훈련' },
];

export const DASHBOARD_ROW1_GROUP_LABEL = '놀이체육 라이브러리';
export const DASHBOARD_ROW2_GROUP_LABEL = 'SPOMOVE 반응훈련';

export interface ProgramBankItem {
  id: number;
  title: string;
  theme: string;
  role: string;
  gradient: string;
  category: 'Play' | 'Think' | 'Grow';
}

export const PROGRAM_BANK: ProgramBankItem[] = Array.from({ length: 100 }, (_, index) => {
  const id = index + 1;
  const bucket = id % 3;
  return {
    id,
    title: `스포키듀 추천 커리큘럼 #${id}`,
    theme: THEMES[id % THEMES.length],
    role: ROLES[id % ROLES.length],
    gradient: GRADIENTS[bucket],
    category: CATEGORIES[bucket],
  };
});

export function getProgramTitle(programId: number): string {
  const program = PROGRAM_BANK.find((item) => item.id === programId);
  return program?.title ?? `커리큘럼 #${programId}`;
}
