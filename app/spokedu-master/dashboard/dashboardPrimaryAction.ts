import type { MasterAccessSnapshot } from '../lib/masterAccessModel';

export type DashboardPrimaryAction =
  | { kind: 'freePreview'; label: '무료 수업 보기' }
  | { kind: 'link'; label: '놀이체육 둘러보기' | '다음 수업 준비' | '놀이체육 찾기'; href: string }
  | { kind: 'liteSpomoveTrial'; label: '이번 주 SPOMOVE 체험'; presetId: string };

export function resolveDashboardPrimaryAction(input: {
  access: MasterAccessSnapshot;
  hasFreePreview: boolean;
  nextSessionHref: string | null;
}): DashboardPrimaryAction {
  const { access, hasFreePreview, nextSessionHref } = input;
  if (access.plan === 'free') {
    return hasFreePreview
      ? { kind: 'freePreview', label: '무료 수업 보기' }
      : { kind: 'link', label: '놀이체육 둘러보기', href: '/spokedu-lab/library' };
  }
  if (nextSessionHref) return { kind: 'link', label: '다음 수업 준비', href: nextSessionHref };
  if (access.plan === 'lite' && access.subscriptionStatus === 'active' && access.spomoveTrialPresetId) {
    return { kind: 'liteSpomoveTrial', label: '이번 주 SPOMOVE 체험', presetId: access.spomoveTrialPresetId };
  }
  return { kind: 'link', label: '놀이체육 찾기', href: '/spokedu-lab/library' };
}
