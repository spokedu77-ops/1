/**
 * MASTER 내비 라벨 SSOT — StatusBar(데스크톱)와 TabBar(모바일)가 같은 역할·같은 표기를 쓴다.
 * shortLabel은 하단 탭 폭 제한용이며 aria-label/전체 라벨은 label을 쓴다.
 */
export const MASTER_NAV_ITEMS = [
  { key: 'dashboard', href: '/spokedu-master/dashboard', label: '홈', shortLabel: '홈' },
  { key: 'programs', href: '/spokedu-master/programs', label: '프로그램', shortLabel: '프로그램' },
  { key: 'favorites', href: '/spokedu-master/favorites', label: '즐겨찾기', shortLabel: '즐겨찾기' },
  { key: 'manage', href: '/spokedu-master/manage', label: '수업 관리', shortLabel: '수업 관리' },
  { key: 'class-tools', href: '/spokedu-master/class-tools', label: '수업 도구', shortLabel: '도구' },
] as const;

export type MasterNavKey = (typeof MASTER_NAV_ITEMS)[number]['key'];
