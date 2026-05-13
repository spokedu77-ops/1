import type { PlanType, UserProfile } from '../types';

export type LimitStatus = {
  allowed: boolean;
  label: string;
  reason?: string;
};

export const PLAN_LIMITS: Record<PlanType, { kakaoMonthly: number | null; aiMonthly: number | null; pdfMonthly: number | null; canUseDirectorDashboard: boolean }> = {
  free: { kakaoMonthly: 50, aiMonthly: 5, pdfMonthly: 3, canUseDirectorDashboard: false },
  pro: { kakaoMonthly: 200, aiMonthly: 20, pdfMonthly: null, canUseDirectorDashboard: false },
  team: { kakaoMonthly: null, aiMonthly: null, pdfMonthly: null, canUseDirectorDashboard: true },
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
      reason: '무료 체험이 종료되어 새 수업 기록 생성이 제한됩니다. 기존 학생 이력은 계속 열람할 수 있습니다.',
    };
  }
  return { allowed: true, label: '기록 가능' };
}

export function canUseMonthlyLimit(plan: PlanType, used: number, kind: 'kakao' | 'ai' | 'pdf'): LimitStatus {
  const limits = PLAN_LIMITS[plan];
  const limit = kind === 'kakao' ? limits.kakaoMonthly : kind === 'ai' ? limits.aiMonthly : limits.pdfMonthly;
  if (limit === null) return { allowed: true, label: '무제한' };
  if (used >= limit) {
    return {
      allowed: false,
      label: `${used}/${limit}`,
      reason:
        kind === 'kakao'
          ? '카카오 발송 한도를 초과했습니다. 메시지는 재시도 목록에 보관됩니다.'
          : kind === 'ai'
            ? 'AI 코멘트 한도를 초과했습니다. 직접 입력은 계속 사용할 수 있습니다.'
            : 'PDF 생성 한도를 초과했습니다.',
    };
  }
  return { allowed: true, label: `${used}/${limit}` };
}

export function createParentShareToken(studentId: string, now = Date.now()): string {
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  return `spm.${studentId}.${expiresAt}`;
}

export function validateParentShareToken(token: string | null, studentId: string): LimitStatus {
  if (!token) {
    return { allowed: false, label: '토큰 없음', reason: '성장 기록 링크가 없거나 잘못된 주소입니다.' };
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
