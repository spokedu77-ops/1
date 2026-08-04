import { PROGRAMS } from './data';
import { findOfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import type { MasterCapability } from '../components/layout/masterRouteAccess';
import { getFallbackForMasterIntent, getSafeMasterPostPaymentPath } from './masterPaymentReturn';

export type MasterGateIntentKind = 'open_library' | 'start_spomove' | 'continue_record';
export type MasterGateSurface =
  | 'library'
  | 'library_detail'
  | 'spomove_hub'
  | 'spomove_session'
  | 'records';
export type MasterPaidPlanId = 'lite' | 'premium';

export type MasterGateIntent = {
  intent: MasterGateIntentKind;
  next: string;
  journeyId: string;
  gateSurface?: MasterGateSurface;
};

export type MasterIntentAccessPlan = {
  minimumPlan: MasterPaidPlanId;
  allowedPlans: readonly MasterPaidPlanId[];
};

export type MasterGateResource = {
  kind: 'program' | 'preset' | 'record' | 'generic';
  id?: string;
  title?: string;
};

export type MasterGateContext = {
  mode: 'direct' | 'gated';
  intent: MasterGateIntentKind | null;
  minimumPlan: MasterPaidPlanId;
  allowedPlans: readonly MasterPaidPlanId[];
  next: string;
  journeyId: string;
  gateSurface?: MasterGateSurface;
  resource: MasterGateResource;
};

export type MasterGateDisplayModel = {
  intent: MasterGateIntentKind;
  minimumPlan: MasterPaidPlanId;
  eyebrow: string;
  title: string;
  description: string;
  resourceTitle?: string;
  evidence: Array<{ label: string; value: string }>;
  ctaLabel: string;
  paymentHref: string;
};

export function resolveMasterIntentAccessPlan(intent: MasterGateIntentKind): MasterIntentAccessPlan {
  if (intent === 'open_library') {
    return { minimumPlan: 'lite', allowedPlans: ['lite', 'premium'] };
  }
  return { minimumPlan: 'premium', allowedPlans: ['premium'] };
}

function createJourneyId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `journey_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeMasterGateIntent(value: string | null | undefined): MasterGateIntentKind | null {
  if (value === 'open_library' || value === 'start_spomove' || value === 'continue_record') return value;
  return null;
}

export function buildCurrentMasterPath(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

export function resolveMasterGateIntentFromRoute(
  capability: Exclude<MasterCapability, 'authenticated'>,
): MasterGateIntentKind | null {
  if (capability === 'library') return 'open_library';
  if (capability === 'spomove') return 'start_spomove';
  if (capability === 'records') return 'continue_record';
  return null;
}

export function resolveMasterGateSurface(pathname: string): MasterGateSurface | undefined {
  if (pathname.startsWith('/spokedu-master/library/')) return 'library_detail';
  if (pathname === '/spokedu-master/library') return 'library';
  if (pathname.startsWith('/spokedu-master/spomove/session')) return 'spomove_session';
  if (pathname.startsWith('/spokedu-master/spomove')) return 'spomove_hub';
  if (
    pathname.startsWith('/spokedu-master/class-record') ||
    pathname.startsWith('/spokedu-master/report') ||
    pathname.startsWith('/spokedu-master/activity') ||
    pathname.startsWith('/spokedu-master/students')
  ) {
    return 'records';
  }
  return undefined;
}

function resolveProgramFromPath(pathname: string) {
  const match = /^\/spokedu-master\/library\/([^/?#]+)/.exec(pathname);
  const programId = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  if (!programId) return null;
  return PROGRAMS.find((program) => program.id === programId) ?? { id: programId, title: '선택한 수업 자료' };
}

export function resolveMasterGateResource(args: {
  intent: MasterGateIntentKind;
  next: string;
}): MasterGateResource {
  const parsed = new URL(args.next, 'https://spokedu.local');
  if (args.intent === 'start_spomove') {
    const presetId = parsed.searchParams.get('preset')?.trim();
    const preset = findOfficialSpomovePreset(presetId);
    return { kind: 'preset', id: presetId || undefined, title: preset?.title ?? '선택한 SPOMOVE 활동' };
  }

  const programFromPath = resolveProgramFromPath(parsed.pathname);
  const programId = programFromPath?.id ?? parsed.searchParams.get('program')?.trim() ?? undefined;
  const program = programId ? PROGRAMS.find((item) => item.id === programId) : null;
  if (programId || programFromPath) {
    return {
      kind: 'program',
      id: programId ?? programFromPath?.id,
      title: program?.title ?? programFromPath?.title ?? '선택한 수업 자료',
    };
  }

  const recordId = parsed.searchParams.get('record')?.trim();
  if (recordId) return { kind: 'record', id: recordId, title: '선택한 수업 기록' };
  return { kind: 'generic' };
}

export function buildMasterGateContext(args: {
  capability: Exclude<MasterCapability, 'authenticated'>;
  pathname: string;
  currentPath: string;
  journeyId?: string;
}): MasterGateContext | null {
  const intent = resolveMasterGateIntentFromRoute(args.capability);
  if (!intent) return null;
  const next = getSafeMasterPostPaymentPath(args.currentPath, getFallbackForMasterIntent(intent));
  const accessPlan = resolveMasterIntentAccessPlan(intent);
  return {
    mode: 'gated',
    intent,
    ...accessPlan,
    next,
    journeyId: args.journeyId ?? createJourneyId(),
    gateSurface: resolveMasterGateSurface(args.pathname),
    resource: resolveMasterGateResource({ intent, next }),
  };
}

export function buildMasterPaymentHref(context: Pick<MasterGateContext, 'intent' | 'minimumPlan' | 'next' | 'journeyId' | 'gateSurface'>) {
  if (!context.intent) {
    return `/spokedu-master/payment?plan=${context.minimumPlan}`;
  }
  const params = new URLSearchParams({
    plan: context.minimumPlan,
    intent: context.intent,
    next: context.next,
    journeyId: context.journeyId,
  });
  if (context.gateSurface) params.set('gateSurface', context.gateSurface);
  return `/spokedu-master/payment?${params.toString()}`;
}

export function buildMasterGateDisplayModel(context: MasterGateContext): MasterGateDisplayModel {
  if (!context.intent) {
    throw new Error('Master gate display requires a gated intent.');
  }
  const paymentHref = buildMasterPaymentHref(context);
  const resourceTitle = context.resource.title;

  if (context.intent === 'start_spomove') {
    return {
      intent: context.intent,
      minimumPlan: context.minimumPlan,
      eyebrow: '방금 하려던 작업',
      title: resourceTitle ? `${resourceTitle}을 바로 시작하려고 했습니다.` : 'SPOMOVE 활동을 바로 시작하려고 했습니다.',
      description: 'Premium에서는 공식 진행 가이드와 전체 화면 실행을 결제 후 같은 활동으로 이어갈 수 있습니다.',
      resourceTitle,
      evidence: [
        { label: '복귀 위치', value: 'SPOMOVE 실행 화면' },
        { label: '수업 흐름', value: '도입, 집중 전환, 반응 활동' },
        { label: '권한', value: 'Premium' },
      ],
      ctaLabel: 'Premium으로 계속 시작',
      paymentHref,
    };
  }

  if (context.intent === 'continue_record') {
    return {
      intent: context.intent,
      minimumPlan: context.minimumPlan,
      eyebrow: '방금 하려던 작업',
      title: resourceTitle ? `${resourceTitle} 기록을 이어가려고 했습니다.` : '수업 기록을 이어가려고 했습니다.',
      description: 'Premium에서는 수업 기록, 학생별 메모, 안내문 흐름을 결제 후 같은 화면에서 이어갈 수 있습니다.',
      resourceTitle,
      evidence: [
        { label: '복귀 위치', value: '기록 작성 화면' },
        { label: '활용', value: '수업 근거와 보호자 안내' },
        { label: '권한', value: 'Premium' },
      ],
      ctaLabel: 'Premium으로 기록 계속하기',
      paymentHref,
    };
  }

  return {
    intent: context.intent,
    minimumPlan: context.minimumPlan,
    eyebrow: '방금 하려던 작업',
    title: resourceTitle ? `${resourceTitle} 자료를 열려고 했습니다.` : '수업 자료를 열려고 했습니다.',
    description: 'Lite부터 전체 수업 자료를 열 수 있고, 결제 후 방금 보려던 자료로 바로 돌아갑니다.',
    resourceTitle,
    evidence: [
      { label: '복귀 위치', value: '수업 자료 화면' },
      { label: '포함', value: '준비물, 진행 순서, 지도 포인트' },
      { label: '최소 권한', value: 'Lite' },
    ],
    ctaLabel: 'Lite로 자료 계속 보기',
    paymentHref,
  };
}

export function readMasterGateContextFromSearchParams(searchParams: URLSearchParams): MasterGateContext {
  const intent = normalizeMasterGateIntent(searchParams.get('intent'));
  if (!intent) {
    return {
      mode: 'direct',
      intent: null,
      minimumPlan: 'lite',
      allowedPlans: ['lite', 'premium'],
      next: '/spokedu-master/dashboard',
      journeyId: searchParams.get('journeyId')?.trim() || createJourneyId(),
      resource: { kind: 'generic' },
    };
  }
  const accessPlan = resolveMasterIntentAccessPlan(intent);
  const next = getSafeMasterPostPaymentPath(searchParams.get('next'), getFallbackForMasterIntent(intent));
  const journeyId = searchParams.get('journeyId')?.trim() || createJourneyId();
  return {
    mode: 'gated',
    intent,
    ...accessPlan,
    next,
    journeyId,
    gateSurface: resolveMasterGateSurface(next.split('?')[0] ?? ''),
    resource: resolveMasterGateResource({ intent, next }),
  };
}
