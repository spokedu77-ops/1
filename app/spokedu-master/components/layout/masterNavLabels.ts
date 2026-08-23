/**
 * MASTER 내비 라벨 SSOT — StatusBar(데스크톱)와 TabBar(모바일)가 같은 역할·같은 표기를 쓴다.
 * shortLabel은 하단 탭 폭 제한용이며 aria-label/전체 라벨은 label을 쓴다.
 */
export const MASTER_NAV_ITEMS = [
  { key: 'dashboard', href: '/spokedu-master/dashboard', label: '홈', shortLabel: '홈' },
  { key: 'library', href: '/spokedu-master/library', label: '놀이체육', shortLabel: '놀이체육' },
  { key: 'spomove', href: '/spokedu-master/spomove', label: 'SPOMOVE', shortLabel: '무브' },
  { key: 'class-tools', href: '/spokedu-master/class-tools', label: '수업 도구', shortLabel: '도구' },
  { key: 'activity', href: '/spokedu-master/activity', label: '수업 관리', shortLabel: '수업' },
  { key: 'profile', href: '/spokedu-master/profile', label: '프로필', shortLabel: '프로필' },
] as const;

export type MasterNavKey = (typeof MASTER_NAV_ITEMS)[number]['key'];
