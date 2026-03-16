/**
 * 관리자/역할 관련 상수 (하드코딩 제거용)
 */
export const ADMIN_NAMES = ['최지훈', '김구민', '김윤기'] as const;
export type AdminName = (typeof ADMIN_NAMES)[number];

/** 마스터(최고 관리자) 이메일 — 정산 리포트 등 제한 접근용 */
export const MASTER_EMAIL = 'choijihoon@spokedu.com';

/**
 * 환경변수 ADMIN_EMAILS 기반 어드민 이메일 목록.
 * 쉼표로 구분한 이메일 문자열. 설정 없으면 빈 배열 (ADMIN_NAMES fallback 사용).
 * 예: ADMIN_EMAILS="a@example.com,b@example.com"
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const ROLES = {
  ADMIN: 'admin',
  MASTER: 'master',
  TEACHER: 'teacher',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
