import { PROGRAMS } from './data';
import { findOfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import type { MasterCapability } from '../components/layout/masterRouteAccess';
import { getFallbackForMasterIntent, getSafeMasterPostPaymentPath } from './masterPaymentReturn';
import { normalizeMasterAppPath } from './masterNavigationContext';

export type MasterGateIntentKind = 'open_library' | 'use_attendance' | 'start_spomove' | 'continue_record';
export type MasterGateSurface =
  | 'library'
  | 'library_detail'
  | 'spomove_hub'
  | 'spomove_session'
  | 'attendance'
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
  if (intent === 'open_library' || intent === 'use_attendance' || intent === 'continue_record') {
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
  // session_capture is the Session Capture panel alias for continue_record.
  if (value === 'session_capture') return 'continue_record';
  if (value === 'open_library' || value === 'use_attendance' || value === 'start_spomove' || value === 'continue_record') return value;
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
  if (capability === 'attendance') return 'use_attendance';
  if (capability === 'spomove') return 'start_spomove';
  if (capability === 'records') return 'continue_record';
  return null;
}

export function resolveMasterGateSurface(pathname: string): MasterGateSurface | undefined {
  const path = normalizeMasterAppPath(pathname);
  if (path.startsWith('/spokedu-lab/library/')) return 'library_detail';
  if (path === '/spokedu-lab/library') return 'library';
  if (path.startsWith('/spokedu-lab/spomove/session')) return 'spomove_session';
  if (path.startsWith('/spokedu-lab/spomove')) return 'spomove_hub';
  if (
    path.startsWith('/spokedu-lab/activity') ||
    path.startsWith('/spokedu-lab/classes') ||
    path === '/spokedu-lab/students'
  ) {
    return 'attendance';
  }
  if (
    path.startsWith('/spokedu-lab/class-record') ||
    path.startsWith('/spokedu-lab/report') ||
    path.startsWith('/spokedu-lab/students/')
  ) {
    return 'records';
  }
  return undefined;
}

function resolveProgramFromPath(pathname: string) {
  const match = /^\/spokedu-lab\/library\/([^/?#]+)/.exec(normalizeMasterAppPath(pathname));
  const programId = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  if (!programId) return null;
  return PROGRAMS.find((program) => program.id === programId) ?? { id: programId, title: '선택한 수업' };
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
      title: program?.title ?? programFromPath?.title ?? '선택한 수업',
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

export function buildProgramLessonGateHref(programId: string, currentPath?: string, journeyId = createJourneyId()) {
  const fallback = `/spokedu-lab/library/${encodeURIComponent(programId)}`;
  const next = currentPath ? getSafeMasterPostPaymentPath(currentPath, fallback) : fallback;
  return buildMasterPaymentHref({
    intent: 'open_library',
    minimumPlan: 'lite',
    next,
    journeyId,
    gateSurface: 'library_detail',
  });
}

export function buildSpomoveActivityGateHref(next: string, journeyId = createJourneyId()) {
  return buildMasterPaymentHref({
    intent: 'start_spomove',
    minimumPlan: 'premium',
    next: getSafeMasterPostPaymentPath(next, '/spokedu-lab/spomove'),
    journeyId,
    gateSurface: 'spomove_session',
  });
}

export function buildMasterPaymentHref(context: Pick<MasterGateContext, 'intent' | 'minimumPlan' | 'next' | 'journeyId' | 'gateSurface'>) {
  if (!context.intent) {
    return `/spokedu-lab/payment?plan=${context.minimumPlan}`;
  }
  const params = new URLSearchParams({
    plan: context.minimumPlan,
    intent: context.intent,
    next: context.next,
    journeyId: context.journeyId,
  });
  if (context.gateSurface) params.set('gateSurface', context.gateSurface);
  const nextUrl = new URL(context.next, 'https://spokedu.local');
  for (const key of ['session', 'returnTo', 'source', 'preset'] as const) {
    const value = nextUrl.searchParams.get(key)?.trim();
    if (value) params.set(key, value);
  }
  return `/spokedu-lab/payment?${params.toString()}`;
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
      eyebrow: 'SPOMOVE PREMIUM',
      title: 'Premium에서 시작할 수 있는 SPOMOVE 활동입니다.',
      description: 'Premium으로 업그레이드하면 선택한 활동으로 돌아와 수업 준비를 바로 이어갈 수 있습니다.',
      resourceTitle,
      evidence: [
        { label: '돌아갈 화면', value: resourceTitle || '선택한 SPOMOVE 활동' },
        { label: '이어서 할 일', value: '활동 설정 후 수업 시작' },
        { label: '필요 이용권', value: 'Premium' },
      ],
      ctaLabel: 'Premium으로 계속하기',
      paymentHref,
    };
  }

  if (context.intent === 'continue_record') {
    return {
      intent: context.intent,
      minimumPlan: context.minimumPlan,
      eyebrow: '방금 하려던 작업',
      title: resourceTitle ? `${resourceTitle} 기록을 이어가려고 했습니다.` : '수업 기록을 이어가려고 했습니다.',
      description: 'Lite에서 수업 메모와 학생 기록을 남기고, 지난 수업의 맥락을 다음 준비에 이어 사용할 수 있습니다.',
      resourceTitle,
      evidence: [
        { label: '복귀 위치', value: '기록 작성 화면' },
        { label: '활용', value: '수업 근거와 보호자 안내' },
        { label: '권한', value: 'Lite' },
      ],
      ctaLabel: 'Lite로 기록 계속하기',
      paymentHref,
    };
  }

  if (context.intent === 'use_attendance') {
    return {
      intent: context.intent,
      minimumPlan: context.minimumPlan,
      eyebrow: '방금 하려던 작업',
      title: '수업반과 출석부를 이어서 사용하려고 했습니다.',
      description: 'Lite에서 수업반, 학생 명단, 일정과 출석을 이어 사용해 수업마다 같은 운영 정보를 다시 만들지 않습니다.',
      resourceTitle,
      evidence: [
        { label: '복귀 위치', value: '방금 보던 수업 운영 화면' },
        { label: '포함', value: '수업반, 일정, 학생 명단, 출석부' },
        { label: '최소 권한', value: 'Lite' },
      ],
      ctaLabel: 'Lite로 수업 운영 계속하기',
      paymentHref,
    };
  }

  return {
    intent: context.intent,
    minimumPlan: context.minimumPlan,
    eyebrow: 'SPOKEDU LAB LITE',
    title: '이 수업 자료는 Lite에서 확인할 수 있습니다.',
    description: 'Lite로 업그레이드하면 전체 수업 자료와 즐겨찾기를 이용할 수 있습니다. 선택한 수업으로 돌아와 바로 이어서 확인할 수 있습니다.',
    resourceTitle,
    evidence: [
      { label: '선택한 수업', value: resourceTitle || '수업 라이브러리 콘텐츠' },
      { label: '확인할 내용', value: '준비물, 진행 순서, 지도 포인트' },
      { label: '필요 이용권', value: 'Lite' },
    ],
    ctaLabel: 'Lite로 계속하기',
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
      next: '/spokedu-lab/dashboard',
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
