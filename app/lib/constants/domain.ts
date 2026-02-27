/**
 * 이메일 도메인 등 앱 전역 도메인 상수
 */
export const EMAIL_DOMAIN = '@spokedu.com';

/** 기본 강사 이메일 생성 (이름만 있을 때) */
export function defaultTeacherEmail(name: string): string {
  return `${name.replace(/\s+/g, '').toLowerCase()}${EMAIL_DOMAIN}`;
}
