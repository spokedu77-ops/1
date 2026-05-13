import type { PlanType, UserProfile } from '../types';

export type LimitStatus = {
  allowed: boolean;
  label: string;
  reason?: string;
};

export const PLAN_LIMITS: Record<PlanType, { kakaoMonthly: number | null; aiMonthly: number | null; pdfMonthly: number | null; canUseDirectorDashboard: boolean }> = {
  free: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
  pro: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
  team: { kakaoMonthly: 0, aiMonthly: 0, pdfMonthly: 0, canUseDirectorDashboard: false },
};

export function getTrialDaysLeft(profile: UserProfile | null): number {
  if (!profile?.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(profile.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function isTrialExpired(profile: UserProfile | null): boolean {
  return (profile?.plan ?? 'free') === 'free' && getTrialDaysLeft(profile) <= 0;
}

export function canCreateClassRecord(profile: UserProfile | null): LimitStatus {
  if (isTrialExpired(profile)) {
    return {
      allowed: false,
      label: '체험 만료',
      reason: '무료 체험이 종료되어 새 수업 기록 생성이 제한됩니다. 기존 데이터는 계속 열람할 수 있습니다.',
    };
  }
  return { allowed: true, label: '사용 가능' };
}

export function canUseMonthlyLimit(_plan: PlanType, _used: number, kind: 'kakao' | 'ai' | 'pdf'): LimitStatus {
  const label = kind === 'kakao' ? '준비 중' : kind === 'ai' ? '준비 중' : '설명 도구 우선';
  return {
    allowed: false,
    label,
    reason: '상용화 첫 버전에서는 외부 자동 발송과 자동 리포트보다 라이브러리, SPOMOVE, 수업 설명 도구를 우선 제공합니다.',
  };
}

export function createParentShareToken(studentId: string, now = Date.now()): string {
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  return `spm.${studentId}.${expiresAt}`;
}

export function validateParentShareToken(token: string | null, studentId: string): LimitStatus {
  if (!token) {
    return { allowed: false, label: '토큰 없음', reason: '공유 링크가 없거나 주소가 올바르지 않습니다.' };
  }
  const [prefix, tokenStudentId, expiresAtRaw] = token.split('.');
  const expiresAt = Number(expiresAtRaw);
  if (prefix !== 'spm' || tokenStudentId !== studentId || !Number.isFinite(expiresAt)) {
    return { allowed: false, label: '토큰 오류', reason: '학생 정보와 공유 링크가 일치하지 않습니다.' };
  }
  if (expiresAt < Date.now()) {
    return { allowed: false, label: '만료', reason: '이 링크는 7일 유효 기간이 지나 만료되었습니다.' };
  }
  return { allowed: true, label: '유효' };
}

export const createParentPreviewToken = createParentShareToken;
export const validateParentPreviewToken = validateParentShareToken;
