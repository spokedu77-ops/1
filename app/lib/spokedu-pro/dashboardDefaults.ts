/**
 * v4 대시보드 큐레이션 기본값 및 테마 키.
 * center_content(또는 tenant_content) key: dashboard_v4
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
  'co-op': '협동 놀이',
  'speed-reaction': '스피드리액션',
  cognitive: '인지 발달',
  challenge: '챌린지',
  'tag-duel': '술래 대결',
  'variant-sports': '변형스포츠',
};

export const ROW1_ROLES = ['Intro', 'Core', 'Play', 'Screen', 'Cooldown'] as const;
export type Row1Role = (typeof ROW1_ROLES)[number];

export interface DashboardItemRow1 {
  programId: number;
  role: string;
  tag2: string[]; // 표시 전용, 최대 2개 사용
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

export interface DashboardV4 {
  weekTheme: WeekTheme;
  row2: Row2Block;
}

const defaultWeekTheme: WeekTheme = {
  badge: '이번 주 테마',
  title: '스피드리액션',
  subtitle: '장비 부담 없이 바로 시작하는 4가지 구성. 웜업/리드업/놀이체육 파이를 책임집니다.',
  themeKey: 'speed-reaction',
  items: [
    { programId: 1, role: 'Intro', tag2: ['준비물없음', '집중유도'] },
    { programId: 2, role: 'Core', tag2: ['인지발달', '규칙학습'] },
    { programId: 3, role: 'Play', tag2: ['협동미션', '팀대결'] },
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
    { programId: 8, tag2: ['술래', '대결'] },
  ],
};

export const DEFAULT_DASHBOARD_V4: DashboardV4 = {
  weekTheme: defaultWeekTheme,
  row2: defaultRow2,
};

/** Admin/뷰 공용: programId → 표시용 메타. 1~100 더미. 실제 연동 시 catalog 교체 */
const THEMES = ['인트로 프로그램', '협동 놀이체육', '스피드리액션', '인지 발달', '챌린지', '술래 대결', '변형스포츠'];
const ROLES = ['Intro', 'Lead-up', 'Core', 'Play', 'Screen', 'Cooldown', 'Finisher'];
const GRADIENTS = ['from-orange-500 to-red-600', 'from-emerald-500 to-teal-600', 'from-purple-500 to-indigo-600'];
const CATEGORIES = ['Play', 'Think', 'Grow'] as const;

/** ThemeKey → PROGRAM_BANK의 theme 문자열 매핑 */
export const THEME_KEY_TO_BANK_THEME: Record<ThemeKey, string> = {
  intro: '인트로 프로그램',
  'co-op': '협동 놀이체육',
  'speed-reaction': '스피드리액션',
  cognitive: '인지 발달',
  challenge: '챌린지',
  'tag-duel': '술래 대결',
  'variant-sports': '변형스포츠',
};

export interface ProgramBankItem {
  id: number;
  title: string;
  theme: string;
  role: string;
  gradient: string;
  category: 'Play' | 'Think' | 'Grow';
}

export const PROGRAM_BANK: ProgramBankItem[] = Array.from({ length: 100 }, (_, i) => {
  const idx = (i + 1) % 3;
  return {
    id: i + 1,
    title: `스포키듀 추천 커리큘럼 #${i + 1}`,
    theme: THEMES[(i + 1) % THEMES.length],
    role: ROLES[(i + 1) % ROLES.length],
    gradient: GRADIENTS[idx],
    category: CATEGORIES[idx],
  };
});

export function getProgramTitle(programId: number): string {
  const p = PROGRAM_BANK.find((x) => x.id === programId);
  return p?.title ?? `커리큘럼 #${programId}`;
}
