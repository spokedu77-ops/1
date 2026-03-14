/**
 * 관리자/역할 관련 상수
 * ADMIN_NAMES: 환경변수 ADMIN_NAMES (쉼표 구분) 또는 기본값 사용
 * MASTER_EMAIL: 환경변수 MASTER_EMAIL 또는 기본값 사용
 */
const envAdminNames = process.env.ADMIN_NAMES;
export const ADMIN_NAMES: readonly string[] = envAdminNames
  ? envAdminNames.split(',').map((s) => s.trim()).filter(Boolean)
  : ['최지훈', '김구민', '김윤기'];

/** 마스터(최고 관리자) 이메일 — 정산 리포트 등 제한 접근용 */
export const MASTER_EMAIL = process.env.MASTER_EMAIL ?? 'choijihoon@spokedu.com';

export const ROLES = {
  ADMIN: 'admin',
  MASTER: 'master',
  TEACHER: 'teacher',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
