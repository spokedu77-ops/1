/**
 * 관리자/역할 관련 상수 (하드코딩 제거용)
 */
export const ADMIN_NAMES = ['최지훈', '김구민', '김윤기'] as const;
export type AdminName = (typeof ADMIN_NAMES)[number];

/** 마스터(최고 관리자) 이메일 — 정산 리포트 등 제한 접근용 */
export const MASTER_EMAIL = 'choijihoon@spokedu.com';

export const ROLES = {
  ADMIN: 'admin',
  MASTER: 'master',
  TEACHER: 'teacher',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
